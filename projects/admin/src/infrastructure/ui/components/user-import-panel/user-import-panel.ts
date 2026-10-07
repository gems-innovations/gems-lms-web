import { Component, input, output, signal } from '@angular/core';
import { getRoleLabel } from 'auth';
import { ICreateUserForm } from '../../forms/user-form/user-form';
import { parseUsersXlsx } from './user-xlsx.parser';

@Component({
  selector: 'adm-user-import-panel',
  templateUrl: './user-import-panel.html',
  styleUrl: './user-import-panel.scss'
})
export class UserImportPanel {
  readonly isImporting = input<boolean>(false);

  readonly importUsers = output<ICreateUserForm[]>();
  readonly closed = output<void>();

  protected readonly preview = signal<ICreateUserForm[]>([]);
  protected readonly error = signal<string | null>(null);

  protected readonly getRoleLabel = getRoleLabel;

  protected onFileChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;
    this.error.set(null);

    const reader = new FileReader();
    reader.onload = async e => {
      const { rows, error } = await parseUsersXlsx(e.target!.result as ArrayBuffer);
      this.error.set(error);
      this.preview.set(rows);
    };
    reader.readAsArrayBuffer(file);
    inputEl.value = '';
  }

  protected confirm(): void {
    const rows = this.preview();
    if (!rows.length) return;
    this.importUsers.emit(rows);
    this.preview.set([]);
  }

  protected backToUpload(): void {
    this.preview.set([]);
  }

  protected close(): void {
    this.preview.set([]);
    this.error.set(null);
    this.closed.emit();
  }
}
