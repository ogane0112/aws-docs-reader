import { useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { openOfficialPage } from '../lib/lastOpened';
import type { PageProgress } from '../types';

function ReviewRow({ progress, title, service }: { progress: PageProgress; title: string; service?: string }) {
  return (
    <li className="review-row">
      <button
        className="review-row__main"
        onClick={() => openOfficialPage({ guideId: '', url: progress.url, title })}
      >
        <span className="review-row__title">{title}</span>
        {service && <span className="review-row__service">{service}</span>}
        {progress.memo && <span className="review-row__memo">{progress.memo}</span>}
      </button>
    </li>
  );
}

export function Review() {
  const { guides, allFlatPages, progress, loading } = useAppData();

  const pageInfo = useMemo(() => {
    const byUrl = new Map(allFlatPages.map((p) => [p.url, p]));
    const guideById = new Map(guides.map((g) => [g.id, g]));
    return { byUrl, guideById };
  }, [allFlatPages, guides]);

  if (loading) return <p className="page-message">読み込み中…</p>;

  const reviewPages = progress.filter((p) => p.status === 'review');
  const memoPages = progress.filter((p) => p.memo && p.memo.trim() !== '');

  return (
    <div className="page page--review">
      <section>
        <h1>要復習 ({reviewPages.length})</h1>
        {reviewPages.length === 0 && <p className="page-message">要復習のページはありません。</p>}
        <ul className="review-list">
          {reviewPages.map((p) => {
            const info = pageInfo.byUrl.get(p.url);
            return (
              <ReviewRow
                key={p.url}
                progress={p}
                title={info?.title ?? p.url}
                service={info ? pageInfo.guideById.get(info.guideId)?.service : undefined}
              />
            );
          })}
        </ul>
      </section>

      <section>
        <h1>メモ付きページ ({memoPages.length})</h1>
        {memoPages.length === 0 && <p className="page-message">メモ付きのページはありません。</p>}
        <ul className="review-list">
          {memoPages.map((p) => {
            const info = pageInfo.byUrl.get(p.url);
            return (
              <ReviewRow
                key={p.url}
                progress={p}
                title={info?.title ?? p.url}
                service={info ? pageInfo.guideById.get(info.guideId)?.service : undefined}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}
