'use client';

import { useEffect, useState } from 'react';

export default function StartupNotice() {
  const [visible, setVisible] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    if (!visible || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="mb-4 text-4xl">🐾</div>
        <div className="space-y-2 text-lg font-semibold leading-8 text-gray-900">
          <p>该软件由金毛狗妹饲养员免费发布</p>
          <p>任何收费均为侵权行为</p>
          <p>作者QQ：3415388638</p>
        </div>
        <button
          type="button"
          disabled={secondsLeft > 0}
          onClick={() => setVisible(false)}
          className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold transition ${
            secondsLeft > 0
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-pink-500 text-white shadow-lg shadow-pink-200 hover:bg-pink-600'
          }`}
        >
          {secondsLeft > 0 ? `${secondsLeft}s 后可确认` : '确认进入'}
        </button>
      </div>
    </div>
  );
}
