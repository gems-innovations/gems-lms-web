import type { Preview } from '@storybook/angular';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    a11y: { test: 'error' },
    backgrounds: {
      default: 'GEMS oscuro',
      values: [
        { name: 'GEMS oscuro', value: '#080d18' },
        { name: 'GEMS claro', value: '#f5f7fb' },
      ],
    },
  },
};

export default preview;
