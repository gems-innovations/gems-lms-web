import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { PageComponent, PageHeaderComponent, TabsComponent } from 'shared';
import type { TabItem } from 'shared';
import { UserManagementContainer } from '../user-management-container/user-management-container';
import { GroupsView } from '../../components/groups-view/groups-view';

type TPeopleTab = 'users' | 'groups';

@Component({
  selector: 'adm-people-container',
  standalone: true,
  imports: [PageComponent, PageHeaderComponent, TabsComponent, UserManagementContainer, GroupsView],
  templateUrl: './people-container.html',
  styleUrl: './people-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleContainer {
  protected readonly tabs: TabItem[] = [
    { id: 'users',  label: 'Usuarios' },
    { id: 'groups', label: 'Grupos' },
  ];

  protected readonly activeTab = signal<TPeopleTab>('users');

  protected setTab(id: string): void { this.activeTab.set(id as TPeopleTab); }
}
