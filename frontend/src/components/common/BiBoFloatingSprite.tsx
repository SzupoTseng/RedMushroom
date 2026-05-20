import { memo } from 'react';
import { useSenLayout } from '../../context/ConfigContext';

/**
 * BiBo 浮動吉祥物
 * 使用 CSS GPU 動畫，外層 pointer-events-none 確保不阻擋點擊。
 * SEN（輕鬆學習）模式下隱藏，避免分散注意力。
 */
const BiBoFloatingSprite = memo(function BiBoFloatingSprite() {
  const sen = useSenLayout();
  if (sen) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 pointer-events-none"
      aria-hidden="true"
    >
      <div className="animate-float pointer-events-auto cursor-pointer select-none text-5xl">
        🍄
      </div>
    </div>
  );
});

export default BiBoFloatingSprite;
