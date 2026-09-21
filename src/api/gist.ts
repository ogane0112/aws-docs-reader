import type { ProgressFile } from '../types';

const GIST_FILENAME = 'aws-docs-reader.json';
const API_BASE = 'https://api.github.com';

const EMPTY_PROGRESS: ProgressFile = { version: 1, pages: {} };

interface GistFile {
  filename: string;
  content: string;
}

interface GistSummary {
  id: string;
  files: Record<string, GistFile>;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
  };
}

async function githubRequest(path: string, token: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${path} failed: HTTP ${res.status} ${body}`.trim());
  }
  return res;
}

/**
 * Finds the user's existing aws-docs-reader.json gist, or creates a new
 * secret one. Returns the gist id (requirements 4: "初回設定時、自分の
 * Gistから同名ファイルを探し、なければ新規作成する").
 */
export async function findOrCreateGistId(token: string): Promise<string> {
  const res = await githubRequest('/gists?per_page=100', token);
  const gists: GistSummary[] = await res.json();
  const existing = gists.find((g) => Object.keys(g.files).includes(GIST_FILENAME));
  if (existing) return existing.id;

  const createRes = await githubRequest('/gists', token, {
    method: 'POST',
    body: JSON.stringify({
      description: 'AWS Docs Reader progress data',
      public: false, // secret gist, per requirements 4 (セキュリティ)
      files: { [GIST_FILENAME]: { content: JSON.stringify(EMPTY_PROGRESS, null, 2) } },
    }),
  });
  const created: GistSummary = await createRes.json();
  return created.id;
}

export async function fetchGistProgress(token: string, gistId: string): Promise<ProgressFile> {
  const res = await githubRequest(`/gists/${gistId}`, token);
  const gist: GistSummary = await res.json();
  const file = gist.files[GIST_FILENAME];
  if (!file) return EMPTY_PROGRESS;
  try {
    const parsed = JSON.parse(file.content);
    if (parsed && typeof parsed === 'object' && parsed.pages) return parsed as ProgressFile;
  } catch {
    // fall through to empty
  }
  return EMPTY_PROGRESS;
}

export async function pushGistProgress(token: string, gistId: string, data: ProgressFile): Promise<void> {
  await githubRequest(`/gists/${gistId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } } }),
  });
}
