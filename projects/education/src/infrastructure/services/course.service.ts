import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, throwError, catchError, shareReplay, tap } from 'rxjs';
import { environment } from 'shared';
import { AuthSessionService, getFullName } from 'auth';
import {
  ICourse,
  ICourseModule,
  ILesson,
  IContentBlock,
  ICreateCourseRequest,
  IUpdateCourseRequest,
  ICreateModuleRequest,
  ICreateLessonRequest,
  ICreateContentBlockRequest,
  ICourseListResponse,
  ICourseFilters,
  ECourseStatus,
  EDifficulty,
  EContentType
} from '../../domain/model/course.model';

// ── API contracts (ms-education) ──────────────────────────────────────────────

interface IContentApi { id: number; lessonId: number; type: string; value: string | null; orderIndex: number; }
interface ILessonApi {
  id: number; moduleId: number; title: string; orderIndex: number; contents: IContentApi[] | null;
  description?: string | null; isFree?: boolean | null;
}
interface IModuleApi {
  id: number; courseId: number; title: string; orderIndex: number; lessons: ILessonApi[] | null;
  description?: string | null;
}

export interface ICourseApi {
  id: number;
  title: string;
  description: string | null;
  status: string;
  difficulty: string;
  tags: string[] | null;
  thumbnailUrl: string | null;
  instructorName: string | null;
  institutionId: string;
  totalDuration: number | null;
  totalLessons: number | null;
  enrolledCount: number | null;
  completionRate: number | null;
  averageRating: number | null;
  ratingCount: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  modules: IModuleApi[] | null;
}

interface ICourseListApi {
  courses: ICourseApi[];
  total: number;
  page: number;
  limit: number;
}

/** Fields of a content block that live in the JSON stored in the API's `value` column. */
type TBlockPayload = Omit<IContentBlock, 'id' | 'type' | 'order'>;

// ── Mapping ───────────────────────────────────────────────────────────────────
// The API stores each content block as {type, orderIndex, value}; `value` holds the
// rest of the front-end block serialized as JSON. Plain-text values (written by other
// clients) are interpreted as the block's main payload.

function parseBlock(c: IContentApi): IContentBlock {
  const type = c.type as EContentType;
  let payload: Partial<TBlockPayload> = {};
  if (c.value) {
    try {
      const parsed = JSON.parse(c.value);
      payload = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      payload = type === EContentType.VIDEO ? { url: c.value } : { markdownContent: c.value };
    }
  }
  return {
    title: '',
    duration: 0,
    isRequired: true,
    ...payload,
    id: String(c.id),
    type,
    order: c.orderIndex
  };
}

function serializeBlock(block: IContentBlock): { id?: number; type: string; orderIndex: number; value: string } {
  const { id, type, order, ...payload } = block;
  return { id: toApiId(id), type, orderIndex: order, value: JSON.stringify(payload) };
}

/** Ids created by the API are numeric; anything else is a not-yet-saved item. */
function toApiId(id: string | undefined): number | undefined {
  return id && /^\d+$/.test(id) ? Number(id) : undefined;
}

export function mapCourse(r: ICourseApi): ICourse {
  const modules: ICourseModule[] = (r.modules ?? [])
    .map(m => ({
      id: String(m.id),
      title: m.title,
      description: m.description ?? undefined,
      order: m.orderIndex,
      lessons: (m.lessons ?? [])
        .map(l => {
          const contentBlocks = (l.contents ?? []).map(parseBlock).sort((a, b) => a.order - b.order);
          return {
            id: String(l.id),
            title: l.title,
            order: l.orderIndex,
            description: l.description ?? undefined,
            isFree: l.isFree === true,
            contentBlocks,
            duration: contentBlocks.reduce((acc, b) => acc + (b.duration ?? 0), 0)
          } satisfies ILesson;
        })
        .sort((a, b) => a.order - b.order)
    }))
    .sort((a, b) => a.order - b.order);

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalDuration = modules.reduce((acc, m) => acc + m.lessons.reduce((s, l) => s + l.duration, 0), 0);

  return {
    id: String(r.id),
    title: r.title,
    description: r.description ?? '',
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    status: r.status as ECourseStatus,
    difficulty: r.difficulty as EDifficulty,
    modules,
    tags: r.tags ?? [],
    institutionId: r.institutionId,
    instructorName: r.instructorName ?? undefined,
    totalDuration,
    totalLessons,
    enrolledCount: r.enrolledCount ?? 0,
    completionRate: r.completionRate ?? 0,
    averageRating: r.averageRating ?? undefined,
    ratingCount: r.ratingCount ?? undefined,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    publishedAt: r.publishedAt ? new Date(r.publishedAt) : undefined
  };
}

function serializeModules(modules: ICourseModule[]) {
  return modules.map((m, mi) => ({
    id: toApiId(m.id),
    title: m.title,
    description: m.description ?? null,
    orderIndex: m.order ?? mi + 1,
    lessons: m.lessons.map((l, li) => ({
      id: toApiId(l.id),
      title: l.title,
      description: l.description ?? null,
      isFree: l.isFree ?? false,
      orderIndex: l.order ?? li + 1,
      contents: l.contentBlocks.map(serializeBlock)
    }))
  }));
}

const LIST_CACHE_MS = 5000;

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = environment.apiUrls.education.courses;

  // Lesson/module → course lookups, filled from every course this service maps. The
  // editor adds lessons and blocks by moduleId/lessonId only, and the API edits the
  // course tree as a whole.
  private readonly courseIdByModule = new Map<string, string>();
  private readonly courseIdByLesson = new Map<string, string>();
  private readonly listCache = new Map<string, { at: number; response$: Observable<ICourseListResponse> }>();

  getCourses(filters?: ICourseFilters, page = 1, limit = 100): Observable<ICourseListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    // Everyone except the super admin only sees their institution's courses.
    const institutionId = this.session.isSuperAdmin() ? null : this.session.institutionId();
    if (institutionId) params = params.set('institutionId', institutionId);

    // Several screens ask for the same list at once (dashboards combine services that each
    // load it); identical requests within a few seconds share one HTTP call.
    const key = params.toString();
    const cached = this.listCache.get(key);
    if (cached && Date.now() - cached.at < LIST_CACHE_MS) return cached.response$;

    const response$ = this.http.get<ICourseListApi>(this.baseUrl, { params }).pipe(
      map(r => ({
        courses: r.courses.map(c => this.track(mapCourse(c))),
        total: r.total,
        page: r.page,
        limit: r.limit
      })),
      catchError(err => {
        this.listCache.delete(key);
        return throwError(() => err);
      }),
      shareReplay(1)
    );
    this.listCache.set(key, { at: Date.now(), response$ });
    return response$;
  }

  getCourseById(id: string): Observable<ICourse> {
    return this.http.get<ICourseApi>(`${this.baseUrl}/${id}`).pipe(map(c => this.track(mapCourse(c))));
  }

  createCourse(req: ICreateCourseRequest): Observable<ICourse> {
    const institutionId = req.institutionId ?? this.session.institutionId();
    if (!institutionId) {
      return throwError(() => new Error('Selecciona una institución para crear el curso'));
    }
    const user = this.session.user();
    const body = {
      title: req.title,
      description: req.description,
      difficulty: req.difficulty,
      tags: req.tags,
      thumbnailUrl: req.thumbnailUrl,
      status: ECourseStatus.DRAFT,
      institutionId,
      instructorName: user ? getFullName(user) : undefined,
      modules: []
    };
    return this.http.post<ICourseApi>(this.baseUrl, body).pipe(tap(() => this.listCache.clear()), map(c => this.track(mapCourse(c))));
  }

  /** Updates course fields only; the API keeps the module tree untouched. */
  updateCourse(id: string, req: IUpdateCourseRequest): Observable<ICourse> {
    return this.http.put<ICourseApi>(`${this.baseUrl}/${id}`, req).pipe(tap(() => this.listCache.clear()), map(c => this.track(mapCourse(c))));
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(tap(() => this.listCache.clear()));
  }

  addModule(req: ICreateModuleRequest): Observable<ICourse> {
    return this.mutateTree(req.courseId, course => {
      course.modules.push({
        id: '',
        title: req.title,
        description: req.description,
        lessons: [],
        order: course.modules.length + 1
      });
    });
  }

  addLesson(req: ICreateLessonRequest): Observable<ICourse> {
    const courseId = this.courseIdByModule.get(req.moduleId);
    if (!courseId) return throwError(() => new Error('Módulo no encontrado. Recarga el curso.'));
    return this.mutateTree(courseId, course => {
      const mod = course.modules.find(m => m.id === req.moduleId);
      if (!mod) throw new Error('Módulo no encontrado. Recarga el curso.');
      mod.lessons.push({
        id: '',
        title: req.title,
        description: req.description,
        duration: 0,
        contentBlocks: [],
        order: mod.lessons.length + 1,
        isFree: req.isFree ?? false
      });
    });
  }

  addContentBlock(req: ICreateContentBlockRequest): Observable<ICourse> {
    const courseId = this.courseIdByLesson.get(req.lessonId);
    if (!courseId) return throwError(() => new Error('Lección no encontrada. Recarga el curso.'));
    return this.mutateTree(courseId, course => {
      const lesson = course.modules.flatMap(m => m.lessons).find(l => l.id === req.lessonId);
      if (!lesson) throw new Error('Lección no encontrada. Recarga el curso.');
      const { lessonId, ...fields } = req;
      lesson.contentBlocks.push({
        ...fields,
        id: '',
        duration: req.duration ?? 0,
        isRequired: req.isRequired ?? true,
        order: lesson.contentBlocks.length + 1
      });
    });
  }

  /** Reads the latest course, applies `change` to its tree and saves the whole tree. */
  private mutateTree(courseId: string, change: (course: ICourse) => void): Observable<ICourse> {
    return this.getCourseById(courseId).pipe(
      switchMap(course => {
        change(course);
        return this.http.put<ICourseApi>(`${this.baseUrl}/${courseId}`, { modules: serializeModules(course.modules) });
      }),
      tap(() => this.listCache.clear()),
      map(c => this.track(mapCourse(c)))
    );
  }

  private track(course: ICourse): ICourse {
    for (const m of course.modules) {
      this.courseIdByModule.set(m.id, course.id);
      for (const l of m.lessons) this.courseIdByLesson.set(l.id, course.id);
    }
    return course;
  }
}
