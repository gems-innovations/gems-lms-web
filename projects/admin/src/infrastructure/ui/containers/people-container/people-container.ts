import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { PageComponent, PageHeaderComponent, TabsComponent } from 'shared';
import type { TabItem } from 'shared';
import { UserManagementContainer } from '../user-management-container/user-management-container';
import { GroupsView } from '../../components/groups-view/groups-view';
import { UserImport } from '../../components/user-import/user-import';

type TPeopleTab = 'users' | 'groups' | 'import';

@Component({
  selector: 'adm-people-container',
  standalone: true,
  imports: [PageComponent, PageHeaderComponent, TabsComponent, UserManagementContainer, GroupsView, UserImport],
  templateUrl: './people-container.html',
  styleUrl: './people-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleContainer {
  protected readonly tabs: TabItem[] = [
    { id: 'users',  label: 'Usuarios' },
    { id: 'groups', label: 'Grupos' },
    { id: 'import', label: 'Importar CSV' },
  ];

  protected readonly activeTab = signal<TPeopleTab>('users');

  protected setTab(id: string): void { this.activeTab.set(id as TPeopleTab); }
}
