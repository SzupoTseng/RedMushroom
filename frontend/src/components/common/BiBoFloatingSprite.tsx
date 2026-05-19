import React, { memo } from 'react';

/**
 * BiBo 浮動吉祥物
 * 使用 CSS GPU 動畫，外層 pointer-events-none 確保不阻擋點擊
 */
const BiBoFloatingSprite = memo(function BiBoFloatingSprite() {
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
