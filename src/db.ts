import Dexie, { type Table } from 'dexie';
import type { PageProgress } from './types';

export interface SettingRow {
  key: string;
  value: string;
}

export const SETTINGS_KEYS = {
  githubToken: 'githubToken',
  gistId: 'gistId',
  lastSyncAt: 'lastSyncAt',
  pendingPush: 'pendingPush',
} as const;

class AppDB extends Dexie {
  pages!: Table<PageProgress, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('aws-docs-reader');
    this.version(1).stores({
      pages: 'url, status, updatedAt',
      settings: 'key',
    });
  }
}

export const db = new AppDB();

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete(key);
}
