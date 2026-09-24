import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url))

const uiComponentNames = [
  'accordion', 'alert-dialog', 'alert', 'aspect-ratio', 'avatar', 'badge',
  'breadcrumb', 'button-group', 'button', 'calendar', 'card', 'carousel',
  'chart', 'checkbox', 'collapsible', 'combobox', 'command', 'context-menu',
  'dialog', 'direction', 'drawer', 'dropdown-menu', 'empty', 'field',
  'hover-card', 'input-group', 'input-otp', 'input', 'item', 'kbd', 'label',
  'menubar', 'native-select', 'navigation-menu', 'pagination', 'popover',
  'progress', 'radio-group', 'resizable', 'scroll-area', 'select',
  'separator', 'sheet', 'sidebar', 'skeleton', 'slider', 'sonner', 'spinner',
  'switch', 'table', 'tabs', 'textarea', 'toggle-group', 'toggle', 'tooltip',
].sort()

async function moduleNames(directory: string, suffix: string) {
  return (await readdir(path.join(workspaceRoot, directory)))
    .filter((fileName) => fileName.endsWith(suffix))
    .map((fileName) => fileName.slice(0, -suffix.length))
    .sort()
}

test('Storybook keeps one story for every UI module', async () => {
  const [componentFiles, stories] = await Promise.all([
    moduleNames('src/components', '.tsx'),
    moduleNames('src/stories/ui', '.stories.tsx'),
  ])

  assert.deepEqual(stories, uiComponentNames)
  assert.ok(uiComponentNames.every((name) => componentFiles.includes(name)))
})
