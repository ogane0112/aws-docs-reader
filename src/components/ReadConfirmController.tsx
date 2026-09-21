import { useEffect, useState } from 'react';
import { consumeLastOpenedPage, type LastOpenedPage } from '../lib/lastOpened';
import { useAppData } from '../context/AppDataContext';
import { ConfirmSheet } from './ConfirmSheet';
import type { PageStatus } from '../types';

/** Watches for the app regaining focus after an official page was opened,
 * and shows the read-confirmation sheet for it (requirements 3.4). */
export function ReadConfirmController() {
  const { setPageStatus } = useAppData();
  const [pending, setPending] = useState<LastOpenedPage>();

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const page = consumeLastOpenedPage();
      if (page) setPending(page);
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!pending) return null;

  const choose = (status: PageStatus, memo?: string) => {
    setPageStatus(pending.url, status, memo);
    setPending(undefined);
  };

  return <ConfirmSheet title={pending.title} onChoose={choose} onDismiss={() => setPending(undefined)} />;
}
