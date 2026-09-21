import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { ProgressBar } from '../components/ProgressBar';
import { computeGuideStats } from '../lib/progress';

export function Guides() {
  const { guides, flatPagesByGuide, progressByUrl, loading } = useAppData();

  if (loading) return <p className="page-message">読み込み中…</p>;

  return (
    <div className="page page--guides">
      <h1>ガイド一覧</h1>
      <ul className="guide-list">
        {guides.map((guide) => {
          const stats = computeGuideStats(guide.id, flatPagesByGuide.get(guide.id) ?? [], progressByUrl);
          return (
            <li key={guide.id}>
              <Link to={`/guides/${guide.id}`} className="guide-list__item">
                <div className="guide-list__heading">
                  <span className="guide-list__service">{guide.service}</span>
                  <span className="guide-list__title">{guide.title}</span>
                </div>
                <ProgressBar ratio={stats.ratio} />
                <span className="guide-list__count">
                  {stats.completed} / {stats.total} ページ
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
