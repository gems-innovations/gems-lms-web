import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared';

export interface IAnnouncement {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IForumThread {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export interface IForumPost {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IForumThreadPage {
  items: IForumThread[];
  total: number;
}

const str = (v: unknown): string => (v == null ? '' : String(v));

const toAnnouncement = (a: any): IAnnouncement => ({
  id: str(a.id), authorId: str(a.authorId), authorName: a.authorName, title: a.title, body: a.body,
  pinned: !!a.pinned, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt),
});

const toThread = (t: any): IForumThread => ({
  id: str(t.id), authorId: str(t.authorId), authorName: t.authorName, authorRole: t.authorRole, title: t.title,
  body: t.body, pinned: !!t.pinned, locked: !!t.locked, replyCount: t.replyCount ?? 0,
  createdAt: new Date(t.createdAt), updatedAt: new Date(t.updatedAt), lastActivityAt: new Date(t.lastActivityAt),
});

const toPost = (p: any): IForumPost => ({
  id: str(p.id), threadId: str(p.threadId), authorId: str(p.authorId), authorName: p.authorName,
  authorRole: p.authorRole, body: p.body, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt),
});

/** Announcements and forum of a course. */
@Injectable({ providedIn: 'root' })
export class CourseCommunityService {
  private readonly http = inject(HttpClient);
  private readonly coursesUrl = environment.apiUrls.education.courses;

  announcements(courseId: string): Observable<IAnnouncement[]> {
    return this.http.get<any[]>(`${this.coursesUrl}/${courseId}/announcements`).pipe(map(l => l.map(toAnnouncement)));
  }

  saveAnnouncement(courseId: string, value: { title: string; body: string; pinned: boolean }, id?: string): Observable<IAnnouncement> {
    const url = `${this.coursesUrl}/${courseId}/announcements`;
    const request = id ? this.http.put<any>(`${url}/${id}`, value) : this.http.post<any>(url, value);
    return request.pipe(map(toAnnouncement));
  }

  deleteAnnouncement(courseId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.coursesUrl}/${courseId}/announcements/${id}`);
  }

  threads(courseId: string, filter: { search?: string; page?: number; limit?: number } = {}): Observable<IForumThreadPage> {
    let params = new HttpParams().set('page', filter.page ?? 0).set('limit', filter.limit ?? 20);
    if (filter.search) params = params.set('search', filter.search);
    return this.http.get<any[]>(`${this.coursesUrl}/${courseId}/forum/threads`, { params, observe: 'response' }).pipe(
      map(r => ({ items: (r.body ?? []).map(toThread), total: Number(r.headers.get('X-Total-Count') ?? r.body?.length ?? 0) })),
    );
  }

  thread(courseId: string, threadId: string): Observable<{ thread: IForumThread; posts: IForumPost[] }> {
    return this.http.get<any>(`${this.coursesUrl}/${courseId}/forum/threads/${threadId}`)
      .pipe(map(d => ({ thread: toThread(d.thread), posts: (d.posts ?? []).map(toPost) })));
  }

  openThread(courseId: string, title: string, body: string): Observable<IForumThread> {
    return this.http.post<any>(`${this.coursesUrl}/${courseId}/forum/threads`, { title, body }).pipe(map(toThread));
  }

  /** pinned and locked are for the course staff; leave them undefined to keep them. */
  updateThread(courseId: string, threadId: string,
               value: { title: string; body: string; pinned?: boolean; locked?: boolean }): Observable<IForumThread> {
    return this.http.put<any>(`${this.coursesUrl}/${courseId}/forum/threads/${threadId}`, value).pipe(map(toThread));
  }

  deleteThread(courseId: string, threadId: string): Observable<void> {
    return this.http.delete<void>(`${this.coursesUrl}/${courseId}/forum/threads/${threadId}`);
  }

  reply(courseId: string, threadId: string, body: string): Observable<IForumPost> {
    return this.http.post<any>(`${this.coursesUrl}/${courseId}/forum/threads/${threadId}/posts`, { body }).pipe(map(toPost));
  }

  updatePost(courseId: string, postId: string, body: string): Observable<IForumPost> {
    return this.http.put<any>(`${this.coursesUrl}/${courseId}/forum/posts/${postId}`, { body }).pipe(map(toPost));
  }

  deletePost(courseId: string, postId: string): Observable<void> {
    return this.http.delete<void>(`${this.coursesUrl}/${courseId}/forum/posts/${postId}`);
  }
}
