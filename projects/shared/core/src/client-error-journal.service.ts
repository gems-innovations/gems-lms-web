import { Injectable, signal } from '@angular/core';

export interface ClientErrorEntry {
  id: string;
  occurredAt: string;
  path: string;
  category: 'operation' | 'unexpected';
}

const KEY = 'gems-client-errors';
const MAX_ENTRIES = 30;

/** Local, session-scoped diagnostic trail. Never stores request bodies or error messages. */
@Injectable({ providedIn: 'root' })
export class ClientErrorJournal {
  private readonly entries = signal<ClientErrorEntry[]>(this.restore());
  readonly recent = this.entries.asReadonly();

  record(category: ClientErrorEntry['category']): void {
    if (typeof window === 'undefined') return;
    const entry: ClientErrorEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      occurredAt: new Date().toISOString(),
      path: window.location.pathname,
      category,
    };
    this.entries.update(current => [entry, ...current].slice(0, MAX_ENTRIES));
    try { sessionStorage.setItem(KEY, JSON.stringify(this.entries())); } catch { /* optional diagnostics */ }
  }

  clear(): void {
    this.entries.set([]);
    try { sessionStorage.removeItem(KEY); } catch { /* optional diagnostics */ }
  }

  private restore(): ClientErrorEntry[] {
    if (typeof sessionStorage === 'undefined') return [];
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
      return Array.isArray(value) ? value.slice(0, MAX_ENTRIES) : [];
    } catch { return []; }
  }
}
