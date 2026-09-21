import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting, setSetting, SETTINGS_KEYS } from '../db';
import { fetchGuides, fetchToc, flattenToc } from '../api/guides';
import { fetchGistProgress, findOrCreateGistId, pushGistProgress } from '../api/gist';
import { fromProgressFile, mergeProgress, toProgressFile } from '../lib/progress';
import type { FlatPage, Guide, PageProgress, PageStatus, TocDocument } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'not-configured' | 'offline';

interface AppData {
  loading: boolean;
  loadError?: string;
  guides: Guide[];
  tocByGuide: Map<string, TocDocument>;
  flatPagesByGuide: Map<string, FlatPage[]>;
  allFlatPages: FlatPage[];
  progress: PageProgress[];
  progressByUrl: Map<string, PageProgress>;
  setPageStatus: (url: string, status: PageStatus, memo?: string) => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncAt?: string;
  syncNow: () => Promise<void>;
  hasToken: boolean;
}

const AppDataContext = createContext<AppData | undefined>(undefined);

const PUSH_DEBOUNCE_MS = 3000;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [tocByGuide, setTocByGuide] = useState<Map<string, TocDocument>>(new Map());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string>();
  const [hasToken, setHasToken] = useState(false);

  const pushTimer = useRef<ReturnType<typeof setTimeout>>();

  const progress = useLiveQuery(() => db.pages.toArray(), [], []) ?? [];

  // --- initial static data load (guides.json + toc/{id}.json) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loadedGuides = await fetchGuides();
        const tocEntries = await Promise.all(
          loadedGuides.map(async (g) => [g.id, await fetchToc(g.id)] as const),
        );
        if (cancelled) return;
        setGuides(loadedGuides);
        setTocByGuide(new Map(tocEntries));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    getSetting(SETTINGS_KEYS.githubToken).then((t) => setHasToken(!!t));
    getSetting(SETTINGS_KEYS.lastSyncAt).then(setLastSyncAt);
  }, []);

  const flatPagesByGuide = useMemo(() => {
    const map = new Map<string, FlatPage[]>();
    for (const g of guides) {
      const toc = tocByGuide.get(g.id);
      map.set(g.id, toc ? flattenToc(g.id, toc.nodes) : []);
    }
    return map;
  }, [guides, tocByGuide]);

  const allFlatPages = useMemo(() => {
    const pages: FlatPage[] = [];
    for (const g of guides) pages.push(...(flatPagesByGuide.get(g.id) ?? []));
    return pages;
  }, [guides, flatPagesByGuide]);

  const progressByUrl = useMemo(() => new Map(progress.map((p) => [p.url, p])), [progress]);

  const syncNow = useCallback(async () => {
    const token = await getSetting(SETTINGS_KEYS.githubToken);
    setHasToken(!!token);
    if (!token) {
      setSyncStatus('not-configured');
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      let gistId = await getSetting(SETTINGS_KEYS.gistId);
      if (!gistId) {
        gistId = await findOrCreateGistId(token);
        await setSetting(SETTINGS_KEYS.gistId, gistId);
      }

      const remoteFile = await fetchGistProgress(token, gistId);
      const remote = fromProgressFile(remoteFile);
      const local = await db.pages.toArray();

      const { merged, changedFromLocal, changedFromRemote } = mergeProgress(local, remote);

      if (changedFromLocal) {
        await db.pages.bulkPut(merged);
      }
      if (changedFromRemote) {
        await pushGistProgress(token, gistId, toProgressFile(merged));
      }

      const now = new Date().toISOString();
      await setSetting(SETTINGS_KEYS.lastSyncAt, now);
      setLastSyncAt(now);
      setSyncStatus('idle');
    } catch (err) {
      console.error('sync failed', err);
      setSyncStatus('error');
    }
  }, []);

  const schedulePush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      syncNow();
    }, PUSH_DEBOUNCE_MS);
  }, [syncNow]);

  const setPageStatus = useCallback(
    async (url: string, status: PageStatus, memo?: string) => {
      const now = new Date().toISOString();
      const existing = await db.pages.get(url);
      const entry: PageProgress = {
        url,
        status,
        memo: memo ?? existing?.memo,
        updatedAt: now,
        readAt: status === 'done' ? now : existing?.readAt,
      };
      await db.pages.put(entry);
      schedulePush();
    },
    [schedulePush],
  );

  // initial sync + focus/online triggers (requirements 4: タイミング)
  useEffect(() => {
    syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    const onOnline = () => syncNow();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AppData = {
    loading,
    loadError,
    guides,
    tocByGuide,
    flatPagesByGuide,
    allFlatPages,
    progress,
    progressByUrl,
    setPageStatus,
    syncStatus,
    lastSyncAt,
    syncNow,
    hasToken,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
