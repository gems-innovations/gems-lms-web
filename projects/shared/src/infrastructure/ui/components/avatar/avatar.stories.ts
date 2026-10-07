import type { Meta, StoryObj } from '@storybook/angular';
import { AvatarComponent } from './avatar.component';

const meta: Meta<AvatarComponent> = {
  title: 'Sistema/Avatar', component: AvatarComponent, tags: ['autodocs'],
  args: { name: 'María Rodríguez', size: 'md' },
};
export default meta;
type Story = StoryObj<AvatarComponent>;
export const Initials: Story = {};
export const Small: Story = { args: { size: 'sm', name: 'Juan Pérez' } };
