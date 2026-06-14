import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSkeletonComponent } from '@gems-lms-web/shared';
import { SearchBarComponent } from '@gems-lms-web/shared';
import { IInstitution } from '../../../../domain/model/institution.model';

@Component({
  selector: 'adm-institution-list',
  standalone: true,
  imports: [CommonModule, LoadingSkeletonComponent, SearchBarComponent],
  templateUrl: './institution-list.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './institution-list.scss'
})
export class InstitutionList {
  institutions = input<IInstitution[]>([]);
  isLoading = input<boolean>(false);
  error = input<string | null>(null);
  pagination = input<{ page: number; limit: number; total: number }>({ page: 1, limit: 10, total: 0 });
  searchTerm = input<string>('');
  hideCreateButton = input<boolean>(false);

  public readonly Math = Math;
  public readonly onCreateNew = output<void>();
  public readonly onView = output<IInstitution>();
  public readonly onEdit = output<IInstitution>();
  public readonly onDelete = output<IInstitution>();
  public readonly onPageChange = output<number>();
  public readonly onRetry = output<void>();
  public readonly onSearch = output<string>();

  handleCreateNew(): void {
    this.onCreateNew.emit();
  }

  handleView(institution: IInstitution): void {
    this.onView.emit(institution);
  }

  handleEdit(institution: IInstitution): void {
    this.onEdit.emit(institution);
  }

  handleDelete(institution: IInstitution): void {
    this.onDelete.emit(institution);
  }

  handlePageChange(page: number): void {
    this.onPageChange.emit(page);
  }

  loadInstitutions(): void {
    this.onRetry.emit();
  }

  handleSearch(searchTerm: string): void {
    this.onSearch.emit(searchTerm);
  }
}
