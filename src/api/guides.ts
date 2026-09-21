import type { FlatPage, Guide, TocDocument, TocNode } from '../types';

function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}data/${path}`;
}

export async function fetchGuides(): Promise<Guide[]> {
  const res = await fetch(dataUrl('guides.json'));
  if (!res.ok) throw new Error(`guides.json fetch failed: HTTP ${res.status}`);
  const guides: Guide[] = await res.json();
  return [...guides].sort((a, b) => a.priority - b.priority);
}

export async function fetchToc(guideId: string): Promise<TocDocument> {
  const res = await fetch(dataUrl(`toc/${guideId}.json`));
  if (!res.ok) throw new Error(`toc/${guideId}.json fetch failed: HTTP ${res.status}`);
  return res.json();
}

/** Pre-order flatten: matches the official TOC's reading order. */
export function flattenToc(guideId: string, nodes: TocNode[]): FlatPage[] {
  const pages: FlatPage[] = [];
  const walk = (list: TocNode[]) => {
    for (const node of list) {
      if (node.url) pages.push({ guideId, title: node.title, url: node.url });
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return pages;
}
