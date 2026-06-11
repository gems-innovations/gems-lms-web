import { Component, computed, input } from '@angular/core';
import { IUser, EUserRole } from 'auth';

@Component({
  selector: 'adm-user-stats-chips',
  template: `
    <div class="ustats">
      <span class="ustats__chip">
        <strong>{{ users().length }}</strong> usuarios totales
      </span>
      <span class="ustats__chip ustats__chip--admin">
        <strong>{{ admins() }}</strong> admins
      </span>
      <span class="ustats__chip ustats__chip--instructor">
        <strong>{{ instructors() }}</strong> instructores
      </span>
      <span class="ustats__chip ustats__chip--student">
        <strong>{{ students() }}</strong> estudiantes
      </span>
    </div>
  `,
  styleUrl: './user-stats-chips.scss'
})
export class UserStatsChips {
  readonly users = input<IUser[]>([]);

  protected readonly admins = computed(
    () => this.users().filter(u => u.role === EUserRole.ADMIN).length
  );
  protected readonly instructors = computed(
    () => this.users().filter(u => u.role === EUserRole.INSTRUCTOR).length
  );
  protected readonly students = computed(
    () => this.users().filter(u => u.role === EUserRole.STUDENT).length
  );
}
