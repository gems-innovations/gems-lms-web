import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { IStudentProfile, EnrollStudentSearch, EnrollResultBanner } from 'education';
import { LoadingSkeletonComponent } from 'shared';
import { AdminEnrollmentManagerUseCase } from '../../../../application/admin-enrollment-manager.usecase';

@Component({
  selector: 'adm-enrollment-manager-view',
  standalone: true,
  imports: [LoadingSkeletonComponent, EnrollStudentSearch, EnrollResultBanner],
  templateUrl: './enrollment-manager-view.html',
  styleUrl: './enrollment-manager-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentManagerView implements OnInit {
  protected readonly uc = inject(AdminEnrollmentManagerUseCase);

  ngOnInit(): void { this.uc.load(); }

  protected toggleStudent(s: IStudentProfile): void      { this.uc.toggleStudent(s); }
  protected removeStudent(id: string): void               { this.uc.removeStudent(id); }
  protected setTargetType(type: 'course' | 'path'): void { this.uc.setTargetType(type); }
  protected initials(s: IStudentProfile): string          { return this.uc.initials(s); }
  protected enroll(): void                                { this.uc.enroll(); }
}
