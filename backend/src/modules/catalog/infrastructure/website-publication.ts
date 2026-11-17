import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, rename, symlink, rm, access, readlink, readdir, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { catalogBuildResponseSchema } from '@web-app-demo/contracts'
import type { BackendRuntime } from '../../../runtime'
import { runWithJobLock } from '../../../db'
import { enqueueTask } from '../../../outbox'
import { createWooCommerceCatalogSource } from './woocommerce-source'

const stateId = 'nikass'
const maxBuildMs = 5 * 60_000

export function catalogWebsiteRevision(snapshot: unknown, sourceRevision: string) {
  return createHash('sha256').update(sourceRevision).update(JSON.stringify(snapshot)).digest('hex')
}

function settings(runtime: BackendRuntime) {
  const { env } = runtime
  if (!env.WEBSITE_PUBLISH_ROOT) return undefined
  if (!env.WEBSITE_SOURCE_REVISION || !env.WEBSITE_PUBLIC_URL || env.CATALOG_PROVIDER !== 'woocommerce') {
    throw new Error('Website publication requires a source revision and WooCommerce')
  }
  return { root: env.WEBSITE_PUBLISH_ROOT, sourceRevision: env.WEBSITE_SOURCE_REVISION }
}

// Observing WooCommerce does not mutate it. Only a public, validated DTO is persisted.
export async function observeCatalogWebsite(runtime: BackendRuntime) {
  const config = settings(runtime)
  if (!config) return
  const { env } = runtime
  const source = createWooCommerceCatalogSource({
    productsEndpoint: env.WOOCOMMERCE_PRODUCTS_ENDPOINT!, consumerKey: env.WOOCOMMERCE_CONSUMER_KEY!,
    consumerSecret: env.WOOCOMMERCE_CONSUMER_SECRET!, requestTimeoutMs: env.CATALOG_REQUEST_TIMEOUT_MS,
  })
  const products = [...await source.listProducts()].sort((a, b) => a.slug.localeCompare(b.slug))
  const snapshot = catalogBuildResponseSchema.parse({ items: products, stale: false })
  const revision = catalogWebsiteRevision(snapshot, config.sourceRevision)
  await runtime.prisma.$transaction(async (tx) => {
    const current = await tx.websitePublication.findUnique({ where: { id: stateId } })
    if (current?.desiredRevision === revision) return
    await tx.websitePublication.upsert({ where: { id: stateId },
      create: { id: stateId, desiredRevision: revision, desiredSnapshot: snapshot },
      update: { desiredRevision: revision, desiredSnapshot: snapshot },
    })
    await enqueueTask(tx, { type: 'website:rebuild', dedupeKey: revision, payload: { revision } })
  })
}

export async function reconcileCatalogWebsite(runtime: BackendRuntime) {
  const config = settings(runtime)
  if (!config) return
  await runWithJobLock(runtime.prisma, 'catalog-website-publication', async () => {
    const state = await runtime.prisma.websitePublication.findUnique({ where: { id: stateId } })
    if (!state) return
    if (state.activeDeploymentId) {
      const artifact = join(config.root, 'releases', state.activeDeploymentId)
      if (catalogWebsiteRevision(state.activeSnapshot, config.sourceRevision) !== state.activeRevision) {
        await runtime.prisma.websitePublication.update({ where: { id: stateId }, data: {
          activeDeploymentId: null, activeRevision: null, startedAt: null,
          lastError: 'Superseded website source; a new build is required',
        } })
        return
      }
      let ready = false
      try { ready = (await readFile(join(artifact, 'catalog-revision.txt'), 'utf8')).trim() === state.activeRevision }
      catch { /* A running or interrupted build has no completion marker. */ }
      if (ready) {
        const next = join(config.root, `current-${state.activeDeploymentId}`)
        await rm(next, { force: true })
        await symlink(join('releases', state.activeDeploymentId), next)
        const previous = await readlink(join(config.root, 'current'));
        await rename(next, join(config.root, 'current'))
        try {
          const response = await fetch(`${runtime.env.WEBSITE_PUBLIC_URL}/catalog-revision.txt?revision=${state.activeRevision}`, {
            cache: 'no-store', signal: AbortSignal.timeout(10_000),
          })
          if (!response.ok || (await response.text()).trim() !== state.activeRevision) {
            throw new Error('Published website revision could not be verified')
          }
        } catch (error) {
          await symlink(previous, next)
          await rename(next, join(config.root, 'current'))
          throw error
        }
        await runtime.prisma.websitePublication.update({ where: { id: stateId }, data: {
          publishedRevision: state.activeRevision, activeDeploymentId: null, activeRevision: null,
          startedAt: null, lastError: null,
        } })
        // Retain recent automatic releases for rollback; never prune manually published releases.
        const releases = join(config.root, 'releases')
        const candidates = await Promise.all((await readdir(releases))
          .filter((name) => /^catalog-[a-f0-9-]{36}$/.test(name))
          .map(async (name) => ({ name, modified: (await stat(join(releases, name))).mtimeMs })))
        candidates.sort((a, b) => b.modified - a.modified)
        for (const candidate of candidates.slice(3)) {
          if (candidate.name === state.activeDeploymentId || previous.endsWith(candidate.name)
            || Date.now() - candidate.modified < maxBuildMs + 60_000) continue
          await rm(join(releases, candidate.name), { recursive: true, force: true })
          await rm(join(config.root, '.builds', candidate.name), { recursive: true, force: true })
        }
        return
      }
      let failed = false
      try { await access(join(artifact, 'build-failed')); failed = true } catch { /* Still running. */ }
      if (!failed && state.startedAt && Date.now() - state.startedAt.getTime() < maxBuildMs + 60_000) return
      await runtime.prisma.websitePublication.update({ where: { id: stateId }, data: {
        activeDeploymentId: null, activeRevision: null, startedAt: null,
        lastError: failed ? 'Website build failed; previous website preserved' : 'Interrupted website build; retrying',
      } })
      await rm(artifact, { recursive: true, force: true })
      await rm(join(config.root, '.builds', state.activeDeploymentId), { recursive: true, force: true })
      return
    }
    if (state.desiredRevision === state.publishedRevision) return
    const id = `catalog-${randomUUID()}`
    await runtime.prisma.websitePublication.update({ where: { id: stateId }, data: {
      activeDeploymentId: id, activeRevision: state.desiredRevision,
      activeSnapshot: catalogBuildResponseSchema.parse(state.desiredSnapshot), startedAt: new Date(),
    } })
    // The persistent deployment id is written before spawning; a lost spawn is recovered by the timer.
    const child = spawn(process.execPath, [resolve('scripts/build-catalog-website.ts'), id], {
      cwd: resolve('.'), env: process.env, stdio: 'ignore', detached: true,
    })
    child.on('error', () => console.error('Could not start website build; timer will recover it'))
    child.unref()
  }, { timeoutMs: 20_000 })
}

export async function buildCatalogWebsite(runtime: BackendRuntime, id: string) {
  if (!/^catalog-[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid website deployment id')
  const config = settings(runtime)
  if (!config) throw new Error('Website publication is disabled')
  const state = await runtime.prisma.websitePublication.findUniqueOrThrow({ where: { id: stateId } })
  if (state.activeDeploymentId !== id) throw new Error('Website deployment is no longer active')
  const snapshot = catalogBuildResponseSchema.parse(state.activeSnapshot)
  const artifact = join(config.root, 'releases', id)
  const work = join(config.root, '.builds', id)
  await mkdir(artifact, { recursive: true })
  await mkdir(work, { recursive: true })
  try {
    const file = join(work, 'catalog.json')
    await writeFile(file, JSON.stringify(snapshot), { mode: 0o600 })
    await new Promise<void>((done, reject) => {
      const child = spawn(process.execPath, ['run', 'build', '--outDir', artifact], {
        cwd: resolve('../website'), stdio: 'ignore', detached: true,
        env: { ...process.env, CATALOG_BUILD_FILE: file, CATALOG_DEMO_DISCOUNTED: 'false' },
      })
      const timer = setTimeout(() => {
        // Stop the whole build process group, including Astro's child process.
        if (child.pid) { try { process.kill(-child.pid, 'SIGKILL') } catch { /* Already stopped. */ } }
      }, maxBuildMs)
      child.on('error', (error) => { clearTimeout(timer); reject(error) })
      child.on('close', (code) => {
        clearTimeout(timer)
        code === 0 ? done() : reject(new Error('Website build failed'))
      })
    })
    await access(join(artifact, 'index.html'))
    await access(join(artifact, 'catalog', 'index.html'))
    await writeFile(join(artifact, 'catalog-revision.txt'), state.activeRevision!)
  } catch {
    await writeFile(join(artifact, 'build-failed'), 'Website build failed')
    throw new Error('Website build failed; active website was preserved')
  } finally { await rm(work, { recursive: true, force: true }) }
}
