const STORAGE_KEY = 'aws-docs-reader:lastOpenedPage';

export interface LastOpenedPage {
  guideId: string;
  url: string;
  title: string;
  openedAt: number;
}

/** Records which official page was just opened, so that on return to the
 * app (visibilitychange -> visible) we can show the read-confirmation
 * sheet for it (requirements 3.4). Swallows storage errors (private mode,
 * quota, etc.) since this is a convenience feature, not critical state. */
export function recordOpenedPage(page: Omit<LastOpenedPage, 'openedAt'>): void {
  try {
    const entry: LastOpenedPage = { ...page, openedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function consumeLastOpenedPage(): LastOpenedPage | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as LastOpenedPage;
  } catch {
    return undefined;
  }
}

export function openOfficialPage(page: Omit<LastOpenedPage, 'openedAt'>): void {
  recordOpenedPage(page);
  window.open(page.url, '_blank', 'noopener');
}
