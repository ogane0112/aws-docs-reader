import type { FlatPage, Guide } from '../types';
import { openOfficialPage } from '../lib/lastOpened';

export function NextPageCard({ page, guide }: { page?: FlatPage; guide?: Guide }) {
  if (!page) {
    return (
      <div className="next-page-card next-page-card--empty">
        <p>未読ページはありません 🎉</p>
      </div>
    );
  }

  return (
    <button
      className="next-page-card"
      onClick={() => openOfficialPage({ guideId: page.guideId, url: page.url, title: page.title })}
    >
      <span className="next-page-card__eyebrow">次に読むページ{guide ? ` ・ ${guide.service}` : ''}</span>
      <span className="next-page-card__title">{page.title}</span>
      <span className="next-page-card__cta">公式ページを開く →</span>
    </button>
  );
}
