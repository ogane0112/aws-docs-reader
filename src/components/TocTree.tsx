import { useState } from 'react';
import type { PageProgress, TocNode } from '../types';
import { StatusIcon, nextStatus, type DisplayStatus } from './StatusIcon';
import { useLongPress } from '../hooks/useLongPress';
import { openOfficialPage } from '../lib/lastOpened';
import { useAppData } from '../context/AppDataContext';

function countLeaves(node: TocNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

function countCompletedLeaves(node: TocNode, progressByUrl: Map<string, PageProgress>): number {
  if (node.children.length === 0) return progressByUrl.has(node.url) ? 1 : 0;
  return node.children.reduce((sum, c) => sum + countCompletedLeaves(c, progressByUrl), 0);
}

function displayStatusOf(url: string, progressByUrl: Map<string, PageProgress>): DisplayStatus {
  return progressByUrl.get(url)?.status ?? 'unread';
}

function LeafRow({ guideId, node }: { guideId: string; node: TocNode }) {
  const { progressByUrl, setPageStatus } = useAppData();
  const status = displayStatusOf(node.url, progressByUrl);

  const longPress = useLongPress(
    () => openOfficialPage({ guideId, url: node.url, title: node.title }),
    () => setPageStatus(node.url, nextStatus(status)),
  );

  return (
    <div className="toc-row toc-row--leaf" {...longPress}>
      <StatusIcon status={status} />
      <span className="toc-row__title">{node.title}</span>
    </div>
  );
}

function ChapterRow({ guideId, node, depth, path }: { guideId: string; node: TocNode; depth: number; path: string }) {
  const { progressByUrl } = useAppData();
  const [expanded, setExpanded] = useState(depth === 0);

  const total = countLeaves(node);
  const completed = countCompletedLeaves(node, progressByUrl);
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="toc-chapter" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <button className="toc-chapter__header" onClick={() => setExpanded((v) => !v)}>
        <span className="toc-chapter__caret">{expanded ? '▾' : '▸'}</span>
        <span className="toc-chapter__title">{node.title}</span>
        <span className="toc-chapter__pct">{pct}%</span>
      </button>
      {expanded && (
        <div className="toc-chapter__children">
          {node.children.map((child, i) => (
            <TocNodeRow key={`${path}.${i}`} guideId={guideId} node={child} depth={depth + 1} path={`${path}.${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function TocNodeRow({ guideId, node, depth, path }: { guideId: string; node: TocNode; depth: number; path: string }) {
  if (node.children.length > 0) {
    return <ChapterRow guideId={guideId} node={node} depth={depth} path={path} />;
  }
  return <LeafRow guideId={guideId} node={node} />;
}

export function TocTree({ guideId, nodes }: { guideId: string; nodes: TocNode[] }) {
  return (
    <div className="toc-tree">
      {nodes.map((node, i) => (
        <TocNodeRow key={`${i}`} guideId={guideId} node={node} depth={0} path={`${i}`} />
      ))}
    </div>
  );
}
