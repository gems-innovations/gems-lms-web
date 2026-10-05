import { TestBed } from '@angular/core/testing';
import { ClientErrorJournal } from './client-error-journal.service';

describe('ClientErrorJournal', () => {
  beforeEach(() => {
    sessionStorage.removeItem('gems-client-errors');
    TestBed.configureTestingModule({});
  });

  afterEach(() => sessionStorage.removeItem('gems-client-errors'));

  it('keeps a bounded session log without query parameters or error details', () => {
    const journal = TestBed.inject(ClientErrorJournal);
    for (let i = 0; i < 35; i++) journal.record('operation');

    expect(journal.recent().length).toBe(30);
    expect(journal.recent()[0].path).toBe(window.location.pathname);
    expect(JSON.stringify(journal.recent())).not.toContain('message');
    expect(JSON.parse(sessionStorage.getItem('gems-client-errors') ?? '[]').length).toBe(30);

    journal.clear();
    expect(journal.recent()).toEqual([]);
    expect(sessionStorage.getItem('gems-client-errors')).toBeNull();
  });
});
