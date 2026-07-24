'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { BeadPattern, CompiledBeadColor } from '@/lib/types/bead';
import { useI18n } from '@/lib/i18n/context';

function toGray(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return `rgb(${l},${l},${l})`;
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function FocusPage() {
  const { t } = useI18n();
  const [pattern, setPattern] = useState<BeadPattern | null>(null);
  const [palette, setPalette] = useState<CompiledBeadColor[]>([]);
  const [currentColorId, setCurrentColorId] = useState<string>('');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [dark, setDark] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Load data from localStorage
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    try {
      const raw = localStorage.getItem('pindo-focus-data');
      if (!raw) return;
      const { pattern: p, palette: pal } = JSON.parse(raw);
      setPattern(p);
      setPalette(pal);
      // Set first color as current
      if (p && pal.length) {
        const usedIds = new Set<string>();
        for (const row of p.cells) for (const c of row) usedIds.add(c.colorId);
        const first = pal.find((c: CompiledBeadColor) => usedIds.has(c.id));
        if (first) setCurrentColorId(first.id);
      }
    } catch { /* ignore */ }
  }, []);

  // Timer
  useEffect(() => {
    if (!running || !pattern) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [running, pattern]);

  // Observe dark mode
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Color progress data
  const colorProgress = useMemo(() => {
    if (!pattern || !palette.length) return [];
    const counts = new Map<string, number>();
    const doneCounts = new Map<string, number>();
    const { width: w } = pattern.metadata;
    for (let r = 0; r < pattern.cells.length; r++) {
      for (let c = 0; c < pattern.cells[r].length; c++) {
        const id = pattern.cells[r][c].colorId;
        counts.set(id, (counts.get(id) || 0) + 1);
        if (completed.has(`${r},${c}`)) doneCounts.set(id, (doneCounts.get(id) || 0) + 1);
      }
    }
    return palette
      .filter(c => (counts.get(c.id) || 0) > 0)
      .map(c => ({ color: c, total: counts.get(c.id) || 0, done: doneCounts.get(c.id) || 0 }));
  }, [pattern, palette, completed]);

  const totalBeads = useMemo(() => colorProgress.reduce((s, c) => s + c.total, 0), [colorProgress]);
  const totalDone = useMemo(() => colorProgress.reduce((s, c) => s + c.done, 0), [colorProgress]);
  const isAllDone = totalBeads > 0 && totalDone === totalBeads;

  // BFS click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pattern || !currentColorId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { width: w, height: h } = pattern.metadata;
    const cellSize = 20 * zoom;
    const ox = pan.x + (canvas.width / 2 - (w * cellSize) / 2);
    const oy = pan.y + (canvas.height / 2 - (h * cellSize) / 2);
    const col = Math.floor((e.clientX - rect.left - ox) / cellSize);
    const row = Math.floor((e.clientY - rect.top - oy) / cellSize);
    if (row < 0 || row >= h || col < 0 || col >= w) return;
    const clickedId = pattern.cells[row][col].colorId;
    if (clickedId !== currentColorId) return;

    // BFS 4-connected — 数字索引队列，O(n) 替代 O(n²)
    const visited = new Set<number>();
    const bfsQueue: number[] = [row * w + col];
    let qi = 0;
    visited.add(row * w + col);
    while (qi < bfsQueue.length) {
      const idx = bfsQueue[qi++];
      const cr = Math.floor(idx / w), cc = idx % w;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = cr + dr, nc = cc + dc;
        const ni = nr * w + nc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w && !visited.has(ni) && pattern.cells[nr][nc].colorId === clickedId) {
          visited.add(ni);
          bfsQueue.push(ni);
        }
      }
    }

    // Toggle: if all in region completed, uncomplete; else complete all
    const visitedKeys = [...visited].map(i => `${Math.floor(i / w)},${i % w}`);
    const allDone = visitedKeys.every(k => completed.has(k));
    setCompleted(prev => {
      const next = new Set(prev);
      for (const k of visitedKeys) {
        if (allDone) next.delete(k); else next.add(k);
      }
      return next;
    });
  }, [pattern, currentColorId, completed, zoom, pan]);

  // Detect color completion via effect (avoids stale closure)
  useEffect(() => {
    if (celebrating) return;
    const cur = colorProgress.find(c => c.color.id === currentColorId);
    if (cur && cur.total > 0 && cur.done === cur.total) {
      setCelebrating(true);
      setTimeout(() => {
        setCelebrating(false);
        const next = colorProgress.find(c => c.done < c.total);
        if (next) setCurrentColorId(next.color.id);
      }, 1500);
    }
  }, [colorProgress, currentColorId, celebrating]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern || !palette.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = pattern.metadata;
    const cellSize = 20 * zoom;
    const palMap = new Map(palette.map(c => [c.id, c]));

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const ox = pan.x + (canvas.width / 2 - (w * cellSize) / 2);
    const oy = pan.y + (canvas.height / 2 - (h * cellSize) / 2);

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const cell = pattern.cells[r][c];
        const color = palMap.get(cell.colorId);
        if (!color) continue;
        const x = ox + c * cellSize, y = oy + r * cellSize;
        const key = `${r},${c}`;
        const isDone = completed.has(key);
        const isCurrent = cell.colorId === currentColorId;

        if (isCurrent || isDone) {
          ctx.fillStyle = color.hex;
        } else {
          ctx.fillStyle = toGray(color.hex);
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // Grid line
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Checkmark for completed
        if (isDone) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = `${Math.max(8, cellSize * 0.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  }, [pattern, palette, currentColorId, completed, dark, zoom, pan]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(5, z - e.deltaY * 0.001)));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  if (!pattern) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center space-y-4">
          <p className="text-lg">{t('focus.noData')}</p>
          <a href="/" className="inline-block px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600">{t('focus.back')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`w-72 flex-shrink-0 border-r overflow-y-auto p-4 space-y-4 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <a href="/" className="text-sm text-pink-500 dark:text-pink-400 hover:underline">{t('focus.back')}</a>
        <h1 className="text-lg font-bold">{t('focus.title')}</h1>

        {/* Timer */}
        <div className={`rounded-lg p-3 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className="text-xs text-gray-500 mb-1">{t('focus.timer')}</div>
          <div className="text-2xl font-mono font-bold">{formatTime(elapsed)}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setRunning(r => !r)} className="text-xs px-3 py-1 rounded bg-pink-500 text-white hover:bg-pink-600">
              {running ? t('focus.pause') : t('focus.resume')}
            </button>
            <button onClick={() => { setElapsed(0); setRunning(true); }} className="text-xs px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 hover:opacity-80">
              {t('focus.reset')}
            </button>
          </div>
        </div>

        {/* Total progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>{t('focus.progress')}</span>
            <span>{totalDone}/{totalBeads} ({totalBeads > 0 ? Math.round(totalDone / totalBeads * 100) : 0}%)</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${totalBeads > 0 ? (totalDone / totalBeads * 100) : 0}%` }} />
          </div>
        </div>

        {/* Color list */}
        <div className="text-xs text-gray-500 mb-1">{t('focus.colors')}</div>
        <div className="space-y-1">
          {colorProgress.map(({ color, total, done }) => (
            <button key={color.id} onClick={() => setCurrentColorId(color.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition ${
                color.id === currentColorId
                  ? 'ring-2 ring-pink-500 ' + (dark ? 'bg-gray-800' : 'bg-pink-50')
                  : dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              } ${celebrating && color.id === currentColorId ? 'animate-celebrate' : ''}`}>
              <div className="w-6 h-6 rounded border flex-shrink-0" style={{ backgroundColor: color.hex, borderColor: dark ? '#555' : '#ccc' }} />
              <div className="flex-1 min-w-0">
                <div className="truncate">{color.code}</div>
                <div className={`h-1.5 rounded-full overflow-hidden mt-0.5 ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${total > 0 ? (done / total * 100) : 0}%` }} />
                </div>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">{done}/{total}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 italic">{t('focus.clickHint')}</p>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair"
          onClick={handleCanvasClick} onWheel={handleWheel}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          onContextMenu={e => e.preventDefault()} />

        {/* Zoom controls */}
        <div className={`absolute bottom-4 right-4 flex items-center gap-2 rounded-lg px-3 py-1.5 ${dark ? 'bg-gray-800/90' : 'bg-white/90 shadow'}`}>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="text-lg font-bold px-1">−</button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="text-lg font-bold px-1">+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-xs ml-1 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">↺</button>
        </div>

        {/* All done overlay */}
        {isAllDone && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className={`animate-complete-pop text-center p-10 rounded-2xl ${dark ? 'bg-gray-900' : 'bg-white'} shadow-2xl`}>
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">{t('focus.allDone')}</h2>
              <p className="text-gray-500 mb-2">{t('focus.allDoneDesc')}</p>
              <p className="text-lg font-mono font-bold mb-6">{t('focus.totalTime')}: {formatTime(elapsed)}</p>
              <a href="/" className="inline-block px-8 py-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 font-bold">
                {t('focus.back')}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
