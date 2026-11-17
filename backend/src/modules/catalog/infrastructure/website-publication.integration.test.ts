import { afterAll, beforeEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createPrisma } from '../../../db'
import { loadEnv } from '../../../env'
import type { BackendRuntime } from '../../../runtime'
import { catalogWebsiteRevision, reconcileCatalogWebsite } from './website-publication'

const prisma = createPrisma(process.env.TEST_DATABASE_URL!)
const scratch = resolve('../.scratch/website-publication-tests')
await mkdir(scratch, { recursive: true })
const root = await mkdtemp(join(scratch, 'run-'))
const server = Bun.serve({ port: 0, fetch: async () => new Response(await readFile(join(root, 'current/catalog-revision.txt'))) })
const sourceRevision = 'a'.repeat(40)
const revision = catalogWebsiteRevision({ items: [], stale: false }, sourceRevision)
const runtime = { prisma, env: loadEnv({
  DATABASE_URL: process.env.TEST_DATABASE_URL, JWT_SECRET: 'a'.repeat(32),
  CATALOG_PROVIDER: 'woocommerce', WOOCOMMERCE_PRODUCTS_ENDPOINT: 'https://example.com/wp-json/wc/v3/products',
  WOOCOMMERCE_CONSUMER_KEY: 'test', WOOCOMMERCE_CONSUMER_SECRET: 'test',
  WEBSITE_PUBLISH_ROOT: root, WEBSITE_SOURCE_REVISION: sourceRevision,
  WEBSITE_PUBLIC_URL: server.url.toString(),
}) } as BackendRuntime

beforeEach(async () => {
  await prisma.websitePublication.deleteMany()
  await rm(join(root, 'current'), { force: true })
  await mkdir(join(root, 'releases', 'old'), { recursive: true })
  await writeFile(join(root, 'releases/old/catalog-revision.txt'), 'old')
  await symlink('releases/old', join(root, 'current'))
  await prisma.websitePublication.create({ data: { id: 'nikass', desiredRevision: revision,
    desiredSnapshot: { items: [], stale: false }, activeSnapshot: { items: [], stale: false }, publishedRevision: 'old', activeRevision: revision,
    activeDeploymentId: 'candidate', startedAt: new Date(),
  } })
  await rm(join(root, 'releases/candidate'), { recursive: true, force: true })
  await mkdir(join(root, 'releases/candidate'), { recursive: true })
})

afterAll(async () => {
  server.stop(true)
  await prisma.$disconnect()
  await rm(root, { recursive: true, force: true })
})

test('adopts a completed build after restart and verifies the public marker', async () => {
  await writeFile(join(root, 'releases/candidate/catalog-revision.txt'), revision)
  await Promise.all([reconcileCatalogWebsite(runtime), reconcileCatalogWebsite(runtime)])
  expect(await readlink(join(root, 'current'))).toBe('releases/candidate')
  const state = await prisma.websitePublication.findUniqueOrThrow({ where: { id: 'nikass' } })
  expect(state.publishedRevision).toBe(revision)
  expect(state.activeDeploymentId).toBeNull()
})

test('rolls back activation when the public marker cannot be verified', async () => {
  await writeFile(join(root, 'releases/candidate/catalog-revision.txt'), revision)
  const env = { ...runtime.env, WEBSITE_PUBLIC_URL: server.url.toString() + 'missing' }
  const wrongServer = Bun.serve({ port: 0, fetch: () => new Response('old') })
  env.WEBSITE_PUBLIC_URL = wrongServer.url.toString()
  try { await expect(reconcileCatalogWebsite({ ...runtime, env })).rejects.toThrow('could not be verified') }
  finally { wrongServer.stop(true) }
  expect(await readlink(join(root, 'current'))).toBe('releases/old')
})

test('a failed build preserves the active website and becomes retryable', async () => {
  await writeFile(join(root, 'releases/candidate/build-failed'), 'failed')
  await reconcileCatalogWebsite(runtime)
  expect(await readlink(join(root, 'current'))).toBe('releases/old')
  const state = await prisma.websitePublication.findUniqueOrThrow({ where: { id: 'nikass' } })
  expect(state.publishedRevision).toBe('old')
  expect(state.activeDeploymentId).toBeNull()
  expect(state.lastError).toContain('previous website preserved')
})


test('a build from a previous code release cannot replace the new website', async () => {
  await writeFile(join(root, 'releases/candidate/catalog-revision.txt'), revision)
  await reconcileCatalogWebsite({ ...runtime, env: { ...runtime.env, WEBSITE_SOURCE_REVISION: 'b'.repeat(40) } })
  expect(await readlink(join(root, 'current'))).toBe('releases/old')
  const state = await prisma.websitePublication.findUniqueOrThrow({ where: { id: 'nikass' } })
  expect(state.activeDeploymentId).toBeNull()
  expect(state.publishedRevision).toBe('old')
})
