import { describe, expect, it } from 'vitest';
import { countThisWeek, estimateCompletionDate, mergeProgress } from './progress';
import type { PageProgress } from '../types';

function page(url: string, status: PageProgress['status'], updatedAt: string, readAt?: string): PageProgress {
  return { url, status, updatedAt, readAt };
}

describe('mergeProgress', () => {
  it('keeps the newer updatedAt per page (page-level last-write-wins)', () => {
    const local = [page('a', 'done', '2026-01-02T00:00:00Z'), page('b', 'skip', '2026-01-01T00:00:00Z')];
    const remote = [page('a', 'review', '2026-01-01T00:00:00Z'), page('c', 'done', '2026-01-03T00:00:00Z')];

    const { merged, changedFromLocal, changedFromRemote } = mergeProgress(local, remote);

    expect(merged.find((p) => p.url === 'a')?.status).toBe('done'); // local newer, wins
    expect(merged.find((p) => p.url === 'c')?.status).toBe('done'); // only on remote, adopted
    expect(merged).toHaveLength(3);
    expect(changedFromLocal).toBe(true); // 'c' is new to local
    expect(changedFromRemote).toBe(true); // 'b' is new to remote
  });

  it('keeps devices that touched different pages both present', () => {
    const local = [page('a', 'done', '2026-01-01T00:00:00Z')];
    const remote = [page('b', 'review', '2026-01-01T00:00:00Z')];
    const { merged } = mergeProgress(local, remote);
    expect(merged.map((p) => p.url).sort()).toEqual(['a', 'b']);
  });
});

describe('countThisWeek', () => {
  it('counts only readAt within the current calendar week (Monday start)', () => {
    // 2026-09-21 is a Monday.
    const monday = new Date('2026-09-21T10:00:00Z');
    const progress = [
      page('a', 'done', '', '2026-09-21T00:00:00Z'), // this Monday: counted
      page('b', 'done', '', '2026-09-20T23:00:00Z'), // last Sunday: not counted
      page('c', 'review', '', undefined), // no readAt: not counted
    ];
    expect(countThisWeek(progress, monday)).toBe(1);
  });
});

describe('estimateCompletionDate', () => {
  it('returns now when nothing remains', () => {
    const now = new Date('2026-09-21T00:00:00Z');
    expect(estimateCompletionDate([], 0, now)).toEqual(now);
  });

  it('falls back to the 1page/5min, 7h/week assumption without 4 weeks of history', () => {
    const now = new Date('2026-09-21T00:00:00Z');
    const progress = [page('a', 'done', '', '2026-09-20T00:00:00Z')]; // 1 day of history only
    const remaining = 84; // == fallback weekly pace, so ~1 week out
    const result = estimateCompletionDate(progress, remaining, now);
    const daysOut = (result!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysOut).toBeCloseTo(7, 0);
  });

  it('uses the actual last-4-week pace once enough history exists', () => {
    const now = new Date('2026-09-21T00:00:00Z');
    // 8 readAt entries spread across the last 4 weeks (2 pages/week) plus one
    // older entry so history spans >= 28 days.
    const progress: PageProgress[] = [page('old', 'done', '', '2026-08-01T00:00:00Z')];
    for (let i = 0; i < 8; i++) {
      const daysAgo = i * 3; // within the last 24 days
      const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      progress.push(page(`p${i}`, 'done', '', d.toISOString()));
    }
    // pace = 8 pages / 4 weeks = 2 pages/week; 10 remaining -> 5 weeks out
    const result = estimateCompletionDate(progress, 10, now);
    const daysOut = (result!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysOut).toBeCloseTo(35, 0);
  });
});
