import type { PageStatus } from '../types';

export type DisplayStatus = PageStatus | 'unread';

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  unread: '未読',
  done: '読了',
  review: '要復習',
  skip: 'スキップ',
};

export const STATUS_ICON: Record<DisplayStatus, string> = {
  unread: '○',
  done: '●',
  review: '◐',
  skip: '−',
};

/**
 * タップでの循環順: 未読 → 読了 → 要復習 → スキップ → 読了 → ...
 *
 * 未読への巻き戻しはタップでは行わない。未読ページは保存しない設計
 * (5.2) のため、一度保存したレコードを削除して「未読」を表現すると
 * Gist側の更新日時ベースの競合解決で復活してしまう(削除の tombstone
 * を持たないため)。未読に戻したい場合は要件範囲外の操作とする。
 */
const CYCLE: PageStatus[] = ['done', 'review', 'skip'];

export function nextStatus(current: DisplayStatus): PageStatus {
  if (current === 'unread') return 'done';
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

export function StatusIcon({ status }: { status: DisplayStatus }) {
  return (
    <span className={`status-icon status-icon--${status}`} title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]}>
      {STATUS_ICON[status]}
    </span>
  );
}
