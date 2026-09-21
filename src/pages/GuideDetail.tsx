import { Link, useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { TocTree } from '../components/TocTree';

export function GuideDetail() {
  const { guideId } = useParams<{ guideId: string }>();
  const { guides, tocByGuide, loading } = useAppData();

  if (loading) return <p className="page-message">読み込み中…</p>;

  const guide = guides.find((g) => g.id === guideId);
  const toc = guideId ? tocByGuide.get(guideId) : undefined;

  if (!guide || !toc) {
    return (
      <div className="page">
        <p className="page-message">ガイドが見つかりません。</p>
        <Link to="/guides">ガイド一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div className="page page--guide-detail">
      <h1>
        {guide.service}
        <span className="page-subtitle">{guide.title}</span>
      </h1>
      <TocTree guideId={guide.id} nodes={toc.nodes} />
    </div>
  );
}
