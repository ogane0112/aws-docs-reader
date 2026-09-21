// Mirrors requirements.md section 5.

export interface Guide {
  id: string;
  service: string;
  title: string;
  baseUrl: string;
  priority: number;
  pageCount: number;
  generatedAt: string;
}

export interface TocNode {
  title: string;
  url: string;
  children: TocNode[];
}

export interface TocDocument {
  guideId: string;
  nodes: TocNode[];
}

/** A page is only ever stored once it leaves 未読 (unread). */
export type PageStatus = 'done' | 'review' | 'skip';

export interface PageProgress {
  url: string;
  status: PageStatus;
  memo?: string;
  updatedAt: string; // ISO 8601
  readAt?: string; // ISO 8601, set when status becomes "done"
}

/** The shape of aws-docs-reader.json, both in the Gist and in export/import files. */
export interface ProgressFile {
  version: 1;
  pages: Record<string, Omit<PageProgress, 'url'>>;
}

/** A TocNode flattened into a single guide page, in reading order. */
export interface FlatPage {
  guideId: string;
  title: string;
  url: string;
}
