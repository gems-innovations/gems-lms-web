import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { environment } from 'shared';

export interface IAcademicPeriod {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  startsOn: string;
  endsOn: string;
  institutionId?: string;
  /** Set when the period is closed: grades are frozen and courses accept no more activity. */
  closedAt?: string | null;
}

/** One line of the acta: a student's frozen result in a course of a closed period. */
export interface IPeriodRecord {
  courseId: string;
  courseTitle: string;
  studentId: string;
  finalGrade: number | null;
  currentGrade: number | null;
  progress: number | null;
  passed: boolean;
}

export interface IPeriodCloseSummary {
  courses: number;
  students: number;
  passed: number;
  failed: number;
}

type TId = string | number;

interface IAcademicPeriodDto {
  id: TId; name: string; startsOn: string; endsOn: string; institutionId?: string; closedAt?: string | null;
}

interface IPeriodCloseDto {
  courses: number; students: number; passed: number; failed: number; period: IAcademicPeriodDto;
}

interface IPeriodRecordDto {
  courseId: TId; courseTitle: string; studentId: TId;
  finalGrade?: number | null; currentGrade?: number | null; progress?: number | null; passed?: boolean | null;
}

interface IEnrollmentRulesDto {
  periodId?: TId | null; opensAt?: string | null; closesAt?: string | null; capacity?: number | null;
  selfEnrollment?: boolean | null; prerequisiteIds?: TId[] | null;
}

interface IEligibilityDto {
  courseId: TId; allowed?: boolean | null; reasons?: TEnrollmentBlock[] | null;
  missingPrerequisites?: TId[] | null; seatsLeft?: number | null;
  opensAt?: string | null; closesAt?: string | null; period?: { name?: string | null } | null;
}

const toPeriod = (p: IAcademicPeriodDto): IAcademicPeriod => ({
  id: String(p.id), name: p.name, startsOn: p.startsOn, endsOn: p.endsOn,
  institutionId: p.institutionId, closedAt: p.closedAt ?? null,
});

/** Enrollment rules of a course; null means no limit. Dates are local date-times (yyyy-mm-ddThh:mm). */
export interface IEnrollmentRules {
  periodId: string | null;
  opensAt: string | null;
  closesAt: string | null;
  capacity: number | null;
  selfEnrollment: boolean;
  prerequisiteIds: string[];
}

export type TEnrollmentBlock =
  'SELF_ENROLLMENT_DISABLED' | 'NOT_OPEN_YET' | 'CLOSED' | 'FULL' | 'MISSING_PREREQUISITES';

export interface IEligibility {
  courseId: string;
  allowed: boolean;
  reasons: TEnrollmentBlock[];
  missingPrerequisites: string[];
  seatsLeft: number | null;
  opensAt: Date | null;
  closesAt: Date | null;
  periodName: string | null;
}

const REASONS: Record<TEnrollmentBlock, string> = {
  SELF_ENROLLMENT_DISABLED: 'La inscripción la hace la institución',
  NOT_OPEN_YET: 'La inscripción aún no abre',
  CLOSED: 'La inscripción está cerrada',
  FULL: 'No quedan cupos',
  MISSING_PREREQUISITES: 'Debes completar los cursos previos',
};

/** Readable text for one reason. */
export function enrollmentBlockText(reason: string): string {
  return REASONS[reason as TEnrollmentBlock] ?? 'No puedes inscribirte en este curso';
}

/** Readable message for a rejected enrollment (409 ENROLLMENT_NOT_ALLOWED with reasons). */
export function enrollmentErrorText(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse) || err.error?.code !== 'ENROLLMENT_NOT_ALLOWED') return null;
  const reasons: string[] = err.error?.reasons ?? [];
  return reasons.length ? reasons.map(enrollmentBlockText).join('. ') : enrollmentBlockText('');
}

const dateTime = (v: unknown): string | null => (typeof v === 'string' && v ? v.slice(0, 16) : null);

/** Academic periods of the institution and enrollment rules of its courses. */
@Injectable({ providedIn: 'root' })
export class EnrollmentRulesService {
  private readonly http = inject(HttpClient);
  private readonly periodsUrl = environment.apiUrls.education.academicPeriods;
  private readonly coursesUrl = environment.apiUrls.education.courses;

  periods(): Observable<IAcademicPeriod[]> {
    return this.http.get<IAcademicPeriodDto[]>(this.periodsUrl).pipe(map(list => list.map(toPeriod)));
  }

  savePeriod(value: Omit<IAcademicPeriod, 'id'>, id?: string): Observable<IAcademicPeriod> {
    const request = id ? this.http.put<IAcademicPeriodDto>(`${this.periodsUrl}/${id}`, value) : this.http.post<IAcademicPeriodDto>(this.periodsUrl, value);
    return request.pipe(map(toPeriod));
  }

  deletePeriod(id: string): Observable<void> {
    return this.http.delete<void>(`${this.periodsUrl}/${id}`);
  }

  /** Freezes the final grades of the period's courses (the acta) and stops their activity. */
  closePeriod(id: string): Observable<IPeriodCloseSummary & { period: IAcademicPeriod }> {
    return this.http.post<IPeriodCloseDto>(`${this.periodsUrl}/${id}/close`, {}).pipe(map(r => ({
      courses: r.courses, students: r.students, passed: r.passed, failed: r.failed, period: toPeriod(r.period),
    })));
  }

  reopenPeriod(id: string): Observable<IAcademicPeriod> {
    return this.http.post<IAcademicPeriodDto>(`${this.periodsUrl}/${id}/reopen`, {}).pipe(map(toPeriod));
  }

  periodRecords(id: string): Observable<IPeriodRecord[]> {
    return this.http.get<IPeriodRecordDto[]>(`${this.periodsUrl}/${id}/records`).pipe(map(list => list.map(r => ({
      courseId: String(r.courseId), courseTitle: r.courseTitle, studentId: String(r.studentId),
      finalGrade: r.finalGrade ?? null, currentGrade: r.currentGrade ?? null, progress: r.progress ?? null, passed: !!r.passed,
    }))));
  }

  rules(courseId: string): Observable<IEnrollmentRules> {
    return this.http.get<IEnrollmentRulesDto>(`${this.coursesUrl}/${courseId}/enrollment-rules`).pipe(map(toRules));
  }

  saveRules(courseId: string, rules: IEnrollmentRules): Observable<IEnrollmentRules> {
    return this.http.put<IEnrollmentRulesDto>(`${this.coursesUrl}/${courseId}/enrollment-rules`, {
      periodId: rules.periodId ? Number(rules.periodId) : null,
      opensAt: rules.opensAt ? `${rules.opensAt.slice(0, 16)}:00` : null,
      closesAt: rules.closesAt ? `${rules.closesAt.slice(0, 16)}:00` : null,
      capacity: rules.capacity && rules.capacity > 0 ? rules.capacity : null,
      selfEnrollment: rules.selfEnrollment,
      prerequisiteIds: rules.prerequisiteIds.map(Number),
    }).pipe(map(toRules));
  }

  /** Whether the signed-in student may enroll in each course (courses they cannot see are left out). */
  eligibility(courseIds: string[]): Observable<IEligibility[]> {
    if (!courseIds.length) return of([]);
    const params = new HttpParams().set('courseIds', courseIds.join(','));
    return this.http.get<IEligibilityDto[]>(`${this.coursesUrl}/eligibility`, { params }).pipe(map(list => list.map(e => ({
      courseId: String(e.courseId),
      allowed: !!e.allowed,
      reasons: e.reasons ?? [],
      missingPrerequisites: (e.missingPrerequisites ?? []).map(String),
      seatsLeft: e.seatsLeft ?? null,
      opensAt: e.opensAt ? new Date(e.opensAt) : null,
      closesAt: e.closesAt ? new Date(e.closesAt) : null,
      periodName: e.period?.name ?? null,
    }))));
  }
}

function toRules(r: IEnrollmentRulesDto): IEnrollmentRules {
  return {
    periodId: r.periodId != null ? String(r.periodId) : null,
    opensAt: dateTime(r.opensAt),
    closesAt: dateTime(r.closesAt),
    capacity: r.capacity ?? null,
    selfEnrollment: r.selfEnrollment !== false,
    prerequisiteIds: (r.prerequisiteIds ?? []).map(String),
  };
}
