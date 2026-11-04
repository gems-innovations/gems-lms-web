import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthSessionService } from 'auth';
import { EmptyStateComponent, PageComponent, PageHeaderComponent, TabsComponent } from 'shared';
import type { TabItem } from 'shared';
import { UserManagementContainer } from '../user-management-container/user-management-container';
import { GroupsView } from '../../components/groups-view/groups-view';
import { UserImport } from '../../components/user-import/user-import';

type TPeopleTab = 'users' | 'groups' | 'import';

@Component({
  selector: 'adm-people-container',
  standalone: true,
  imports: [EmptyStateComponent, PageComponent, PageHeaderComponent, TabsComponent, UserManagementContainer, GroupsView, UserImport],
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

  /** El super admin no tiene institución: sin esto la lista sale en 0 y le pide «crear el primer usuario». */
  protected readonly sinInstitucion = !inject(AuthSessionService).institutionId();

  protected setTab(id: string): void { this.activeTab.set(id as TPeopleTab); }
}
