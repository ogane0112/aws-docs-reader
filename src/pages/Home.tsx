import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { NextPageCard } from '../components/NextPageCard';
import { ProgressBar } from '../components/ProgressBar';
import { countThisWeek, estimateCompletionDate, nextUnreadPage } from '../lib/progress';

function formatDate(d: Date): string {
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function Home() {
  const { guides, flatPagesByGuide, allFlatPages, progress, progressByUrl, loading, loadError } = useAppData();

  if (loading) return <p className="page-message">読み込み中…</p>;
  if (loadError) return <p className="page-message page-message--error">目次データの読み込みに失敗しました: {loadError}</p>;

  let next;
  let nextGuideId: string | undefined;
  for (const guide of guides) {
    const found = nextUnreadPage(flatPagesByGuide.get(guide.id) ?? [], progressByUrl);
    if (found) {
      next = found;
      nextGuideId = guide.id;
      break;
    }
  }
  const nextGuide = guides.find((g) => g.id === nextGuideId);

  const total = allFlatPages.length;
  const completed = allFlatPages.filter((p) => progressByUrl.has(p.url)).length;
  const overallRatio = total === 0 ? 0 : completed / total;
  const remaining = total - completed;

  const completionDate = estimateCompletionDate(progress, remaining, new Date());
  const thisWeekCount = countThisWeek(progress, new Date());
  const reviewCount = progress.filter((p) => p.status === 'review').length;

  return (
    <div className="page page--home">
      <NextPageCard page={next} guide={nextGuide} />

      <section className="stat-card">
        <h2>全体進捗</h2>
        <ProgressBar ratio={overallRatio} />
        <p className="stat-card__sub">
          {completed} / {total} ページ
          {completionDate && remaining > 0 && <> ・ 完了予定日: {formatDate(completionDate)}</>}
        </p>
      </section>

      <section className="stat-row">
        <div className="stat-tile">
          <span className="stat-tile__value">{thisWeekCount}</span>
          <span className="stat-tile__label">今週読んだページ</span>
        </div>
        <Link to="/review" className="stat-tile stat-tile--link">
          <span className="stat-tile__value">{reviewCount}</span>
          <span className="stat-tile__label">要復習</span>
        </Link>
      </section>
    </div>
  );
}
