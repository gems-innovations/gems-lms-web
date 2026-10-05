import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService, EUserRole } from 'auth';

interface CommandItem {
  label: string;
  description: string;
  route: string;
  roles?: EUserRole[];
  keywords: string;
}

const COMMANDS: CommandItem[] = [
  { label: 'Mi perfil', description: 'Datos personales y foto', route: '/account/profile', keywords: 'perfil cuenta foto usuario' },
  { label: 'Cambiar contraseña', description: 'Seguridad de la cuenta', route: '/account/password', keywords: 'password clave seguridad contraseña' },
  { label: 'Panel principal', description: 'Resumen de la institución', route: '/admin/dashboard', roles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN], keywords: 'inicio dashboard panel resumen' },
  { label: 'Personas', description: 'Usuarios de la institución', route: '/admin/people', roles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN], keywords: 'usuarios personas estudiantes instructores' },
  { label: 'Reportes', description: 'Indicadores y exportación CSV', route: '/admin/reports', roles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN], keywords: 'reportes métricas csv indicadores' },
  { label: 'Cursos', description: 'Crear y administrar cursos', route: '/education/courses', roles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN, EUserRole.INSTRUCTOR], keywords: 'cursos contenido lecciones crear' },
  { label: 'Banco de preguntas', description: 'Preguntas reutilizables', route: '/instructor/question-bank', roles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN, EUserRole.INSTRUCTOR], keywords: 'preguntas quiz cuestionario banco' },
  { label: 'Panel de instructor', description: 'Actividad y revisiones', route: '/instructor', roles: [EUserRole.ADMIN, EUserRole.SUPER_ADMIN, EUserRole.INSTRUCTOR], keywords: 'instructor panel entregas revisión' },
  { label: 'Mi aprendizaje', description: 'Cursos y avance', route: '/learn/home', roles: [EUserRole.STUDENT], keywords: 'aprendizaje mis cursos avance estudiante' },
  { label: 'Explorar cursos', description: 'Catálogo disponible', route: '/learn/catalog', roles: [EUserRole.STUDENT], keywords: 'catalogo cursos explorar descubrir' },
];

@Component({
  selector: 'app-command-palette',
  standalone: true,
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss'
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly open = signal(false);
  readonly query = signal('');
  readonly commands = computed(() => {
    const role = this.session.user()?.role;
    const query = this.query().trim().toLocaleLowerCase();
    return COMMANDS
      .map(command => command.label === 'Mi perfil' && role && role !== EUserRole.STUDENT
        ? { ...command, route: '/admin/profile' }
        : command)
      .filter(command => (!command.roles || (role && command.roles.includes(role)))
        && (!query || `${command.label} ${command.description} ${command.keywords}`.toLocaleLowerCase().includes(query)));
  });

  @HostListener('window:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.show();
    } else if (event.key === 'Escape' && this.open()) {
      this.close();
    }
  }

  selectFirst(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    const first = this.commands()[0];
    if (!first) return;
    event.preventDefault();
    this.go(first);
  }

  show(): void {
    if (!this.session.user()) return;
    this.query.set('');
    this.open.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  close(): void { this.open.set(false); }

  go(command: CommandItem): void {
    this.close();
    void this.router.navigateByUrl(command.route);
  }
}
