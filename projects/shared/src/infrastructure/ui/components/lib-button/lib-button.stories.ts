import type { Meta, StoryObj } from '@storybook/angular';
import { LibButtonComponent } from './lib-button';

const meta: Meta<LibButtonComponent> = {
  title: 'Sistema/Button', component: LibButtonComponent, tags: ['autodocs'],
  args: { variant: 'primary', size: 'md', disabled: false, loading: false, fullWidth: false },
  render: args => ({ props: args, template: '<lib-button [variant]="variant" [size]="size" [disabled]="disabled" [loading]="loading" [fullWidth]="fullWidth">Continuar</lib-button>' }),
};
export default meta;
type Story = StoryObj<LibButtonComponent>;
export const Primary: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Danger: Story = { args: { variant: 'danger' } };
