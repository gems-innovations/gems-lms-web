import type { Meta, StoryObj } from '@storybook/angular';
import { BadgeComponent } from './badge.component';

const meta: Meta<BadgeComponent> = {
  title: 'Sistema/Badge', component: BadgeComponent, tags: ['autodocs'],
  args: { variant: 'success', size: 'md', dot: true },
  render: args => ({ props: args, template: '<lib-badge [variant]="variant" [size]="size" [dot]="dot">Publicado</lib-badge>' }),
};
export default meta;
type Story = StoryObj<BadgeComponent>;
export const Published: Story = {};
export const Pending: Story = { args: { variant: 'warning' }, render: args => ({ props: args, template: '<lib-badge [variant]="variant" [dot]="dot">Pendiente</lib-badge>' }) };
