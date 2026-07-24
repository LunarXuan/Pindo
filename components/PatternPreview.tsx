'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { BeadPattern, CompiledBeadColor } from '@/lib/types/bead';

interface Props {
  pattern: BeadPattern | null;
  palette: CompiledBeadColor[];
  onCellClick?: (row: number, col: number, shiftKey: boolean) => void;
}

export default function PatternPreview({ pattern, palette, onCellClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; scrollX: number; scrollY: number; moved: boolean }>({ dragging: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0, moved: false });
  const touchState = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    scrollX: number;
    scrollY: number;
    distance: number;
    zoom: number;
    centerX: number;
    centerY: number;
  }>({ mode: 'none', startX: 0, startY: 0, scrollX: 0, scrollY: 0, distance: 0, zoom: 1, centerX: 0, centerY: 0 });

  // Ref callback — wheel zoom, mouse drag pan, touch pan and pinch zoom
  const wheelCleanup = useRef<(() => void) | null>(null);
  const wrapRefCb = useCallback((el: HTMLDivElement | null) => {
    if (wheelCleanup.current) { wheelCleanup.current(); wheelCleanup.current = null; }
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom(z => {
        const step = e.deltaY < 0 ? 0.15 : -0.15;
        return Math.round(Math.max(0.1, Math.min(5, z + step)) * 100) / 100;
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      // left button only
      if (e.button !== 0) return;
      dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, scrollX: el.scrollLeft, scrollY: el.scrollTop, moved: false };
      el.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds.dragging) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ds.moved = true;
      el.scrollLeft = ds.scrollX - dx;
      el.scrollTop = ds.scrollY - dy;
    };

    const onMouseUp = () => {
      dragState.current.dragging = false;
      el.style.cursor = '';
    };

    const distanceBetween = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const midpoint = (a: Touch, b: Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchState.current = {
          mode: 'pan',
          startX: touch.clientX,
          startY: touch.clientY,
          scrollX: el.scrollLeft,
          scrollY: el.scrollTop,
          distance: 0,
          zoom,
          centerX: touch.clientX,
          centerY: touch.clientY,
        };
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        const center = midpoint(e.touches[0], e.touches[1]);
        touchState.current = {
          mode: 'pinch',
          startX: center.x,
          startY: center.y,
          scrollX: el.scrollLeft,
          scrollY: el.scrollTop,
          distance: distanceBetween(e.touches[0], e.touches[1]),
          zoom,
          centerX: center.x,
          centerY: center.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const ts = touchState.current;
      if (ts.mode === 'none') return;
      e.preventDefault();
      e.stopPropagation();

      if (ts.mode === 'pan' && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - ts.startX;
        const dy = touch.clientY - ts.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true;
        el.scrollLeft = ts.scrollX - dx;
        el.scrollTop = ts.scrollY - dy;
        return;
      }

      if (e.touches.length >= 2 && ts.distance > 0) {
        const nextDistance = distanceBetween(e.touches[0], e.touches[1]);
        const nextZoom = Math.round(Math.max(0.1, Math.min(5, ts.zoom * (nextDistance / ts.distance))) * 100) / 100;
        const rect = el.getBoundingClientRect();
        const focusX = ts.centerX - rect.left + ts.scrollX;
        const focusY = ts.centerY - rect.top + ts.scrollY;
        const ratio = nextZoom / ts.zoom;
        setZoom(nextZoom);
        requestAnimationFrame(() => {
          el.scrollLeft = focusX * ratio - (ts.centerX - rect.left);
          el.scrollTop = focusY * ratio - (ts.centerY - rect.top);
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchState.current.mode = 'none';
        return;
      }
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchState.current = {
          mode: 'pan',
          startX: touch.clientX,
          startY: touch.clientY,
          scrollX: el.scrollLeft,
          scrollY: el.scrollTop,
          distance: 0,
          zoom,
          centerX: touch.clientX,
          centerY: touch.clientY,
        };
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    wheelCleanup.current = () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom]);

  useEffect(() => {
    if (!pattern || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const { width, height } = pattern.metadata;
    const cellSize = 20;
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    const ctx = canvas.getContext('2d')!;
    const colorMap = new Map(palette.map(c => [c.id, c]));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = pattern.cells[y][x];
        const color = colorMap.get(cell.colorId);
        ctx.fillStyle = color?.hex ?? '#FF00FF';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        if (showGrid) {
          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 0.75;
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
        if (color) {
          const luma = 0.2126 * color.rgb[0] + 0.7152 * color.rgb[1] + 0.0722 * color.rgb[2];
          ctx.fillStyle = luma < 145 ? '#fff' : '#111827';
          ctx.font = '10px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.code, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
        }
      }
    }
  }, [pattern, palette, showGrid]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Ignore click if user was dragging
    if (dragState.current.moved) { dragState.current.moved = false; return; }
    if (!pattern || !onCellClick || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cellSize = 20 * zoom;
    const col = Math.floor((e.clientX - rect.left) / cellSize);
    const row = Math.floor((e.clientY - rect.top) / cellSize);
    if (row >= 0 && row < pattern.metadata.height && col >= 0 && col < pattern.metadata.width) {
      onCellClick(row, col, e.shiftKey);
    }
  };

  if (!pattern) return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
      <div className="text-5xl">🧩</div>
      <p className="mt-4 text-sm text-gray-500">图纸预览区域</p>
      <p className="mt-1 text-xs text-gray-400">请先上传图片并设置参数</p>
    </div>
  );

  const btn = 'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors';

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.25).toFixed(2)))}
          className={`${btn} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`}>−</button>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, +(z + 0.25).toFixed(2)))}
          className={`${btn} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`}>+</button>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
        <button onClick={() => setShowGrid(g => !g)}
          className={`${btn} ${showGrid ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
          {showGrid ? '▦' : '▢'} 网格
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {pattern.metadata.width}×{pattern.metadata.height} 颗 · 双指缩放 · 拖拽移动
        </span>
      </div>
      <div
        ref={wrapRefCb}
        className="overflow-auto rounded-2xl border border-pink-200 dark:border-pink-900/30 bg-white dark:bg-gray-950 cursor-grab select-none shadow-inner"
        style={{ maxHeight: '70vh', touchAction: 'none' }}
      >
        <div style={{ width: pattern.metadata.width * 20 * zoom, height: pattern.metadata.height * 20 * zoom }}>
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          />
        </div>
      </div>
    </div>
  );
}
