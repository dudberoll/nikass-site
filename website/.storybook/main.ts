import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
  framework: { name: '@storybook/react-vite', options: {} },
  staticDirs: ['../public'],
  stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
}

export default config
