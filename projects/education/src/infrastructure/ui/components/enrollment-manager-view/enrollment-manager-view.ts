import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoadingSkeletonComponent } from 'shared';
import { EnrollStudentSearch } from '../enroll-student-search/enroll-student-search';
import { EnrollResultBanner } from '../enroll-result-banner/enroll-result-banner';
import { EducationEnrollmentManagerUseCase } from '../../../../application/education-enrollment-manager.usecase';
import { IStudentProfile } from '../../../services/enrollment.service';

@Component({
  selector: 'edu-enrollment-manager-view',
  standalone: true,
  imports: [FormsModule, LoadingSkeletonComponent, EnrollStudentSearch, EnrollResultBanner],
  templateUrl: './enrollment-manager-view.html',
  styleUrl: './enrollment-manager-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentManagerView implements OnInit {
  protected readonly uc = inject(EducationEnrollmentManagerUseCase);

  ngOnInit(): void { this.uc.load(); }

  protected selectStudent(s: IStudentProfile): void { this.uc.selectStudent(s); }
  protected clearStudent(): void                    { this.uc.clearStudent(); }
  protected initials(s: IStudentProfile): string    { return this.uc.initials(s); }
  protected enrollSingle(): void                    { this.uc.enrollSingle(); }
  protected submitBulk(): void                      { this.uc.submitBulk(); }
}
