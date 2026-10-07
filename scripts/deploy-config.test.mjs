import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
