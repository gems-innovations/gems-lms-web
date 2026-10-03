import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, computed } from '@angular/core';
import { provideMarkdown } from 'ngx-markdown';
import { AuthSessionService } from 'auth';
import { environment } from 'shared';
import { CourseCommunity } from './course-community';

describe('CourseCommunity', () => {
  let http: HttpTestingController;
  const base = `${environment.apiUrls.education.courses}/3`;
  const at = '2026-10-03T10:00:00';
  const thread = { id: 8, courseId: 3, authorId: 5, authorName: 'Ana Ruiz', authorRole: 'STUDENT', title: 'Duda',
    body: '¿Cómo?', pinned: false, locked: false, replyCount: 1, createdAt: at, updatedAt: at, lastActivityAt: at };

  function create(role: string, userId: string): { fixture: ComponentFixture<CourseCommunity>; el: HTMLElement } {
    const user = signal({ id: userId, role });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideMarkdown(),
        { provide: AuthSessionService, useValue: { user, isInstructorOrAbove: computed(() => role !== 'STUDENT') } }],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CourseCommunity);
    fixture.componentRef.setInput('courseId', '3');
    fixture.detectChanges();
    http.expectOne(`${base}/announcements`).flush([
      { id: 1, authorId: 3, authorName: 'Andrés', title: 'Examen', body: 'Viernes', pinned: true, createdAt: at, updatedAt: at },
    ]);
    http.expectOne(r => r.url === `${base}/forum/threads`).flush([thread], { headers: { 'X-Total-Count': '1' } });
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement };
  }

  const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
  const tab = (el: HTMLElement, name: string) => buttons(el).find(b => b.getAttribute('role') === 'tab' && b.textContent!.includes(name))!;

  afterEach(() => http.verify());

  it('shows announcements to students without staff actions', () => {
    const { el } = create('STUDENT', '5');
    expect(el.textContent).toContain('Examen');
    expect(el.textContent).toContain('Fijado');
    expect(buttons(el).some(b => b.textContent!.includes('Nuevo anuncio'))).toBeFalse();
  });

  it('lets staff publish announcements', () => {
    const { el } = create('INSTRUCTOR', '3');
    expect(buttons(el).some(b => b.textContent!.includes('Nuevo anuncio'))).toBeTrue();
  });

  it('opens a thread and replies to it', () => {
    const { fixture, el } = create('STUDENT', '6');
    tab(el, 'Foro').click();
    fixture.detectChanges();
    (el.querySelector('.ccom__thread') as HTMLButtonElement).click();
    http.expectOne(`${base}/forum/threads/8`).flush({ thread, posts: [
      { id: 20, threadId: 8, authorId: 3, authorName: 'Andrés', authorRole: 'INSTRUCTOR', body: 'Así', createdAt: at, updatedAt: at },
    ] });
    fixture.detectChanges();
    expect(el.textContent).toContain('Instructor');
    // Not the author and not staff: no edit or delete on the thread.
    expect(el.querySelector('.ccom__card .ccom__link--danger')).toBeNull();

    (fixture.componentInstance as any).replyText.set('Gracias');
    (fixture.componentInstance as any).sendReply();
    const req = http.expectOne(`${base}/forum/threads/8/posts`);
    expect(req.request.body).toEqual({ body: 'Gracias' });
    req.flush({ id: 21, threadId: 8, authorId: 6, authorName: 'Luis', authorRole: 'STUDENT', body: 'Gracias', createdAt: at, updatedAt: at });
    fixture.detectChanges();
    expect(el.querySelectorAll('.ccom__post').length).toBe(2);
  });

  it('hides the reply box on locked threads for students', () => {
    const { fixture, el } = create('STUDENT', '6');
    (fixture.componentInstance as any).showThread('8');
    http.expectOne(`${base}/forum/threads/8`).flush({ thread: { ...thread, locked: true }, posts: [] });
    (fixture.componentInstance as any).tab.set('forum');
    fixture.detectChanges();
    expect(el.textContent).toContain('cerrado a nuevas respuestas');
  });
});
