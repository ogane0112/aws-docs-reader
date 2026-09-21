import { useState } from 'react';
import type { PageStatus } from '../types';

interface Props {
  title: string;
  onChoose: (status: PageStatus, memo?: string) => void;
  onDismiss: () => void;
}

/** 読了確認シート (requirements 3.4): 公式ページを開いた後にアプリへ戻ると表示する。 */
export function ConfirmSheet({ title, onChoose, onDismiss }: Props) {
  const [memo, setMemo] = useState('');

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet">
        <p className="sheet__eyebrow">読んだページはどうでしたか？</p>
        <p className="sheet__title">{title}</p>

        <input
          className="sheet__memo"
          type="text"
          placeholder="一行メモ（任意）"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={200}
        />

        <div className="sheet__actions">
          <button className="sheet__button sheet__button--primary" onClick={() => onChoose('done', memo || undefined)}>
            読了
          </button>
          <button className="sheet__button" onClick={() => onChoose('review', memo || undefined)}>
            要復習
          </button>
          <button className="sheet__button sheet__button--ghost" onClick={onDismiss}>
            まだ途中
          </button>
        </div>
      </div>
    </div>
  );
}
