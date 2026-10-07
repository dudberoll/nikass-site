import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = readFileSync(resolve(root, 'deploy/deploy.sh'), 'utf8')
const preflight = source.match(/ssh "\$TARGET" bash -s -- "\$previous_arg" <<'REMOTE' \|\| fail [^\n]+\n([\s\S]*?)\nREMOTE/)[1]
  .replace('cd /srv/nikass\n', '')

test('VPS publication rejects missing Telegram settings before activating a release', () => {
  const scratch = resolve(root, '.scratch')
  mkdirSync(scratch, { recursive: true })
  const directory = mkdtempSync(resolve(scratch, 'deploy-config-'))
  const required = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGINS', 'WOOCOMMERCE_PRODUCTS_ENDPOINT',
    'WOOCOMMERCE_STORE_ENDPOINT', 'WOOCOMMERCE_CONSUMER_KEY', 'WOOCOMMERCE_CONSUMER_SECRET',
    'YOO_KASSA_SHOP_ID', 'YOO_KASSA_SECRET_KEY', 'YOO_KASSA_RETURN_URL']
  const telegram = ['ORDER_TELEGRAM_BOT_TOKEN', 'ORDER_TELEGRAM_CHAT_ID']
  const run = (keys) => {
    writeFileSync(resolve(directory, 'runtime.env'), keys.map((key) => `${key}=fixture-value`).join('\n') + '\n')
    return spawnSync('bash', ['-s', 'existing-release'], { cwd: directory, input: preflight, encoding: 'utf8' }).status
  }
  try {
    writeFileSync(resolve(directory, '.env'), 'POSTGRES_PASSWORD=fixture-value\nPOSTGRES_APP_PASSWORD=fixture-value\nMIGRATION_DATABASE_URL=fixture-value\n')
    for (const missing of telegram) {
      assert.notEqual(run([...required, ...telegram.filter((key) => key !== missing)]), 0, missing)
    }
    assert.equal(run([...required, ...telegram]), 0)
  } finally {
    rmSync(directory, { recursive: true })
  }
})

test('VPS publication reuses only an identical runtime image and preserves a changed image during upload', () => {
  const transport = source.match(/  docker buildx build[^\n]*\n([\s\S]*?)\n  activated=1/)[1]
  const run = (previous, remoteFingerprint) => spawnSync('bash', ['-s'], {
    encoding: 'utf8',
    env: { ...process.env, PREVIOUS: previous, REMOTE_FINGERPRINT: remoteFingerprint },
    input: `set -Eeuo pipefail
release=candidate
previous="$PREVIOUS"
TARGET=fixture
docker() {
  case "$1" in
    image) printf 'runtime-v1' ;;
    save) printf 'fixture-image' ;;
    *) return 1 ;;
  esac
}
ssh() {
  case "$*" in
    *'docker image inspect'*)
      if [[ "$REMOTE_FINGERPRINT" == candidate-present ]]; then
        printf 'sha256:previous runtime-v2\\nsha256:candidate runtime-v1\\n'
      elif [[ -n "$REMOTE_FINGERPRINT" ]]; then printf 'sha256:candidate %s\\n' "$REMOTE_FINGERPRINT"; fi ;;
    *'docker tag'*) [[ "$*" == *sha256:candidate* ]] || return 1; printf 'reused\\n' ;;
    *'docker load'*) printf 'uploaded:'; gzip -dc ;;
    *) return 1 ;;
  esac
}
transfer() {
${transport}
}
transfer
`,
  })
  for (const [previous, fingerprint, expected] of [
    ['existing', 'runtime-v1', 'reused\n'],
    ['existing', 'runtime-v2', 'uploaded:fixture-image'],
    ['', '', 'uploaded:fixture-image'],
    ['existing', 'candidate-present', 'reused\n'],
  ]) {
    const result = run(previous, fingerprint)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, expected)
  }
})

test('VPS static transfer reuses unchanged files without modifying the previous release', () => {
  const directory = mkdtempSync(resolve(root, '.scratch/deploy-static-'))
  const old = resolve(directory, 'old'), next = resolve(directory, 'next'), build = resolve(directory, 'build')
  for (const path of [old, next, build]) mkdirSync(path)
  const transfer = source.match(/  local link_dest=[^\n]+\n  rsync[^\n]+/)[0]
    .replace('/var/www/nikass/releases/$previous', '$OLD_DIR')
    .replace('website/dist/', '"$BUILD_DIR/"')
    .replace('"$TARGET:/var/www/nikass/releases/$release/"', '"$NEXT_DIR/"')
  try {
    for (const path of [old, build]) writeFileSync(resolve(path, 'same.txt'), 'unchanged')
    writeFileSync(resolve(old, 'changed.txt'), 'old')
    writeFileSync(resolve(build, 'changed.txt'), 'new content')
    const result = spawnSync('bash', ['-s'], {
      encoding: 'utf8',
      env: { ...process.env, OLD_DIR: old, BUILD_DIR: build, NEXT_DIR: next },
      input: `set -Eeuo pipefail\nprevious=existing\ntransfer() {\n${transfer}\n}\ntransfer\n`,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(resolve(old, 'changed.txt'), 'utf8'), 'old')
    assert.equal(readFileSync(resolve(next, 'changed.txt'), 'utf8'), 'new content')
    assert.equal(statSync(resolve(old, 'same.txt')).ino, statSync(resolve(next, 'same.txt')).ino)
  } finally {
    rmSync(directory, { recursive: true })
  }
})
