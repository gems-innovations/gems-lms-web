import { Component, computed, input } from '@angular/core';
import { IUser, EUserRole } from 'auth';

const isGuest = (u: IUser): boolean => u.email?.endsWith('@invitado.gems.lat') ?? false;

@Component({
  selector: 'adm-user-stats-chips',
  template: `
    <div class="ustats">
      <span class="ustats__chip">
        <strong>{{ reales().length }}</strong> usuarios totales
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
      @if (guests() > 0) {
        <span class="ustats__chip ustats__chip--guest" title="Sesiones de «Empezar gratis»: no cuentan como usuarios ni como estudiantes">
          <strong>{{ guests() }}</strong> invitados
        </span>
      }
    </div>
  `,
  styleUrl: './user-stats-chips.scss'
})
export class UserStatsChips {
  readonly users = input<IUser[]>([]);

  /** Los invitados («Empezar gratis», @invitado.gems.lat) se cuentan aparte: no inflan usuarios ni estudiantes. */
  protected readonly reales = computed(() => this.users().filter(u => !isGuest(u)));
  protected readonly guests = computed(() => this.users().filter(isGuest).length);
  protected readonly admins = computed(
    () => this.reales().filter(u => u.role === EUserRole.ADMIN).length
  );
  protected readonly instructors = computed(
    () => this.reales().filter(u => u.role === EUserRole.INSTRUCTOR).length
  );
  protected readonly students = computed(
    () => this.reales().filter(u => u.role === EUserRole.STUDENT).length
  );
}
