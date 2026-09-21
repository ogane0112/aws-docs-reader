import type { FlatPage, PageProgress, ProgressFile } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_PAGES_PER_WEEK = (7 * 60) / 5; // 週7時間・1ページ5分の仮算出 = 84ページ/週

export function toProgressFile(pages: PageProgress[]): ProgressFile {
  const out: ProgressFile = { version: 1, pages: {} };
  for (const p of pages) {
    out.pages[p.url] = { status: p.status, memo: p.memo, updatedAt: p.updatedAt, readAt: p.readAt };
  }
  return out;
}

export function fromProgressFile(file: ProgressFile): PageProgress[] {
  return Object.entries(file.pages).map(([url, p]) => ({ url, ...p }));
}

/**
 * Page-level last-write-wins merge by updatedAt (requirements 4,
 * 競合解決: "ページ単位でupdatedAtを比較し、新しい方を採用する").
 * Returns the merged set plus whether it differs from `local` (so the
 * caller knows whether a push back to the Gist is needed).
 */
export function mergeProgress(
  local: PageProgress[],
  remote: PageProgress[],
): { merged: PageProgress[]; changedFromLocal: boolean; changedFromRemote: boolean } {
  const byUrl = new Map<string, PageProgress>();
  for (const p of local) byUrl.set(p.url, p);

  let changedFromLocal = false;
  for (const r of remote) {
    const l = byUrl.get(r.url);
    if (!l || new Date(r.updatedAt).getTime() > new Date(l.updatedAt).getTime()) {
      byUrl.set(r.url, r);
      changedFromLocal = true;
    }
  }

  const merged = [...byUrl.values()];
  const changedFromRemote =
    merged.length !== remote.length || merged.some((m) => !remote.find((r) => r.url === m.url && r.updatedAt === m.updatedAt));

  return { merged, changedFromLocal, changedFromRemote };
}

export interface GuideProgressStats {
  guideId: string;
  total: number;
  completed: number; // done + review + skip
  ratio: number; // 0..1
}

export function computeGuideStats(guideId: string, flatPages: FlatPage[], progress: Map<string, PageProgress>): GuideProgressStats {
  const total = flatPages.length;
  const completed = flatPages.filter((p) => progress.has(p.url)).length;
  return { guideId, total, completed, ratio: total === 0 ? 0 : completed / total };
}

export function nextUnreadPage(flatPages: FlatPage[], progress: Map<string, PageProgress>): FlatPage | undefined {
  return flatPages.find((p) => !progress.has(p.url));
}

/** 今週(月曜始まり)に readAt を記録したページ数。 */
export function countThisWeek(progress: PageProgress[], now: Date): number {
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  return progress.filter((p) => p.readAt && new Date(p.readAt) >= startOfWeek).length;
}

/**
 * 完了予定日の算出 (requirements 3.5)。
 * 直近4週間の読了ペースがあればそれを使い、なければ 1ページ5分・週7時間の仮算出を使う。
 */
export function estimateCompletionDate(allProgress: PageProgress[], remainingPages: number, now: Date): Date | undefined {
  if (remainingPages <= 0) return now;

  const readDates = allProgress
    .filter((p) => p.readAt)
    .map((p) => new Date(p.readAt as string).getTime())
    .sort((a, b) => a - b);

  let weeklyPace = FALLBACK_PAGES_PER_WEEK;

  if (readDates.length > 0) {
    const earliest = readDates[0];
    const historySpanDays = (now.getTime() - earliest) / DAY_MS;
    if (historySpanDays >= 28) {
      const fourWeeksAgo = now.getTime() - 28 * DAY_MS;
      const recentCount = readDates.filter((t) => t >= fourWeeksAgo).length;
      weeklyPace = recentCount / 4;
      if (weeklyPace <= 0) weeklyPace = FALLBACK_PAGES_PER_WEEK;
    }
  }

  const weeksNeeded = remainingPages / weeklyPace;
  return new Date(now.getTime() + weeksNeeded * 7 * DAY_MS);
}
