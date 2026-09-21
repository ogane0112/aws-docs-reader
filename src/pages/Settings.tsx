import { useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { db, deleteSetting, setSetting, SETTINGS_KEYS } from '../db';
import { fromProgressFile, mergeProgress, toProgressFile } from '../lib/progress';
import type { ProgressFile } from '../types';

const SYNC_STATUS_LABEL: Record<string, string> = {
  idle: '同期済み',
  syncing: '同期中…',
  error: '同期エラー',
  'not-configured': 'トークン未設定',
  offline: 'オフライン',
};

export function Settings() {
  const { hasToken, syncStatus, lastSyncAt, syncNow } = useAppData();
  const [tokenInput, setTokenInput] = useState('');
  const [message, setMessage] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    await setSetting(SETTINGS_KEYS.githubToken, tokenInput.trim());
    setTokenInput('');
    setMessage('トークンを保存しました。同期します…');
    await syncNow();
    setMessage(undefined);
  };

  const clearToken = async () => {
    await deleteSetting(SETTINGS_KEYS.githubToken);
    await deleteSetting(SETTINGS_KEYS.gistId);
    setMessage('トークンを削除しました。');
  };

  const handleExport = async () => {
    const pages = await db.pages.toArray();
    const file = toProgressFile(pages);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-docs-reader-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: ProgressFile = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.pages) {
        throw new Error('不正なファイル形式です');
      }
      const imported = fromProgressFile(parsed);
      const local = await db.pages.toArray();
      const { merged } = mergeProgress(local, imported);
      await db.pages.bulkPut(merged);
      setMessage(`インポート完了: ${imported.length}件を反映しました。`);
      syncNow();
    } catch (err) {
      setMessage(`インポート失敗: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="page page--settings">
      <h1>設定</h1>

      <section className="settings-section">
        <h2>GitHub同期</h2>
        <p className="settings-section__status">
          状態: {SYNC_STATUS_LABEL[syncStatus] ?? syncStatus}
          {lastSyncAt && <> ・ 最終同期: {new Date(lastSyncAt).toLocaleString('ja-JP')}</>}
        </p>

        {hasToken ? (
          <button className="settings-button settings-button--danger" onClick={clearToken}>
            トークンを削除
          </button>
        ) : (
          <div className="settings-form">
            <input
              type="password"
              placeholder="Personal Access Token (gistスコープ)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button className="settings-button" onClick={saveToken}>
              保存して同期
            </button>
          </div>
        )}

        <button className="settings-button" onClick={() => syncNow()} disabled={!hasToken}>
          今すぐ手動同期
        </button>
      </section>

      <section className="settings-section">
        <h2>バックアップ</h2>
        <div className="settings-form settings-form--row">
          <button className="settings-button" onClick={handleExport}>
            エクスポート
          </button>
          <button className="settings-button" onClick={handleImportClick}>
            インポート
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        </div>
      </section>

      {message && <p className="settings-message">{message}</p>}
    </div>
  );
}
