import { useRef } from 'react';

const LONG_PRESS_MS = 500;

/** Distinguishes a tap from a long-press on the same element (requirements
 * 7.3: タップでステータス変更、長押しで公式ページを開く). */
export function useLongPress(onLongPress: () => void, onTap: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const firedLongPress = useRef(false);

  const start = () => {
    firedLongPress.current = false;
    timer.current = setTimeout(() => {
      firedLongPress.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  const handleClick = () => {
    if (!firedLongPress.current) onTap();
  };

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onClick: handleClick,
  };
}
