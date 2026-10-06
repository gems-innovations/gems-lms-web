import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthSessionService } from 'auth/core';
import { UserService } from '../../../services/user.service';
import { DisplayPreferencesService, ThemePreference } from 'auth/core';
import { ImageUploadComponent, PageComponent, PageHeaderComponent, ToastService } from 'shared';

@Component({
  selector: 'auth-profile-container',
  imports: [CommonModule, FormsModule, ImageUploadComponent, PageComponent, PageHeaderComponent],
  templateUrl: './profile-container.html',
  styleUrl: './profile-container.scss'
})
export class ProfileContainer implements OnInit {
  private readonly session = inject(AuthSessionService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  readonly display = inject(DisplayPreferencesService);
  readonly saving = signal(false);
  firstName = ''; lastName = ''; username = ''; avatarUrl = '';
  readonly user = this.session.user;

  ngOnInit(): void {
    const user = this.user();
    if (!user) return;
    this.firstName = user.firstName; this.lastName = user.lastName; this.username = user.username;
    this.avatarUrl = user.avatarUrl ?? '';
  }

  save(): void {
    const user = this.user();
    if (!user || !this.firstName.trim() || !this.lastName.trim()) return;
    this.saving.set(true);
    this.users.updateProfile(user, { firstName: this.firstName.trim(), lastName: this.lastName.trim(),
      username: this.username.trim(), avatarUrl: this.avatarUrl || undefined }).subscribe({
      next: updated => { this.session.updateUser(updated); this.saving.set(false); this.toast.success('Perfil actualizado.'); },
      error: () => { this.saving.set(false); this.toast.error('No se pudo actualizar el perfil.'); }
    });
  }

  /** La foto se guarda en cuanto se sube; no hace falta pulsar «Guardar». */
  avatarChanged(url: string): void {
    this.avatarUrl = url;
    this.save();
  }

  setTheme(theme: ThemePreference): void { this.display.update({ theme }); }
}
