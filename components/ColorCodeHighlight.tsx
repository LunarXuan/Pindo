'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BeadBrand, BeadPattern, CompiledBeadColor } from '@/lib/types/bead';
import { loadPalette } from '@/lib/data/palettes/loader';
import { recognizePatternFromImage } from '@/lib/engine/pattern-recognition';
import { calculateUsage } from '@/lib/utils/usage-calculator';
import PatternPreview from '@/components/PatternPreview';

interface Props { currentPattern: BeadPattern | null; currentPalette: CompiledBeadColor[]; modeSelector?: ReactNode; }

const BRAND_OPTIONS: Array<{ value: BeadBrand; label: string }> = [
  { value: 'mard', label: 'MARD' }, { value: 'perler', label: 'Perler' }, { value: 'hama', label: 'Hama' },
  { value: 'artkal-s', label: 'Artkal S' }, { value: 'coco', label: 'COCO' }, { value: 'manman', label: '漫漫' }, { value: 'panpan', label: '盼盼' },
];

export default function ColorCodeHighlight({ currentPattern, currentPalette, modeSelector }: Props) {
  const [brand, setBrand] = useState<BeadBrand>('mard');
  const [width, setWidth] = useState(35);
  const [height, setHeight] = useState(35);
  const [pattern, setPattern] = useState<BeadPattern | null>(null);
  const [palette, setPalette] = useState<CompiledBeadColor[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('上传带色号或无色号的拼豆图纸，系统会读取网格颜色并列出可高亮的色号。');
  const inputRef = useRef<HTMLInputElement>(null);
  const usage = useMemo(() => pattern && palette.length ? calculateUsage(pattern, palette) : [], [pattern, palette]);
  const boardInfo = useMemo(() => pattern ? { boards: Math.ceil(pattern.metadata.width / 29) * Math.ceil(pattern.metadata.height / 29), total: pattern.metadata.width * pattern.metadata.height, size: `${pattern.metadata.width}×${pattern.metadata.height}` } : null, [pattern]);
  const applyPattern = useCallback((nextPattern: BeadPattern, nextPalette: CompiledBeadColor[], note: string) => { setPattern(nextPattern); setPalette(nextPalette); setWidth(nextPattern.metadata.width); setHeight(nextPattern.metadata.height); setActiveIds(new Set()); setMessage(note); }, []);
  const readFile = useCallback(async (file: File) => {
    setLoading(true); setMessage('正在读取图纸网格与色号…');
    try {
      const fullPalette = await loadPalette(brand);
      const result = await recognizePatternFromImage(file, { brand, width, height, palette: fullPalette, preferAutoGrid: true });
      applyPattern(result.pattern, result.palette, `已读取 ${new Set(result.pattern.cells.flat().map(cell => cell.colorId)).size} 种色号。点击下方色号即可高亮。`);
    } catch { setMessage('暂时无法稳定读取网格。请确认图片清晰，并在上传前设置正确的宽高颗数。'); }
    finally { setLoading(false); }
  }, [applyPattern, brand, height, width]);
  const toggleCode = useCallback((id: string) => setActiveIds(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; }), []);

  return <div className="grid gap-5 xl:grid-cols-[520px_1fr]">
    <aside className="space-y-5">
      {modeSelector}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="mb-3 text-sm font-semibold text-gray-700">图纸设置</div><div className="grid grid-cols-3 gap-3 text-sm"><label>品牌<select value={brand} onChange={e => setBrand(e.target.value as BeadBrand)} className="mt-1 w-full rounded-lg border border-pink-200 bg-white px-2 py-2">{BRAND_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>宽度<input type="number" min="1" max="200" value={width} onChange={e => setWidth(Number(e.target.value) || 1)} className="mt-1 w-full rounded-lg border border-pink-200 px-2 py-2" /></label><label>高度<input type="number" min="1" max="200" value={height} onChange={e => setHeight(Number(e.target.value) || 1)} className="mt-1 w-full rounded-lg border border-pink-200 px-2 py-2" /></label></div><p className="mt-3 text-xs leading-5 text-gray-500">宽高用于无网格图纸的均匀切分；有稳定网格时会自动识别实际尺寸。</p></div>
      <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) void readFile(file); }} onClick={() => inputRef.current?.click()} className="cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50/40 px-6 py-14 text-center transition hover:bg-pink-50"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void readFile(file); e.currentTarget.value = ''; }} /><div className="text-4xl">🔎</div><div className="mt-3 font-semibold text-pink-600">拖拽图片到此处，或点击上传</div><div className="mt-2 text-xs text-pink-400">支持 PNG / JPG / WebP，最大 10MB</div></div>
      {currentPattern && currentPalette.length > 0 && <button type="button" onClick={() => applyPattern(currentPattern, currentPalette, '已载入本次生成/识别的图纸，点击下方色号即可高亮。')} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100">使用当前已生成 / 识别图纸</button>}
      {boardInfo && <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm"><div className="font-semibold">图纸信息</div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2"><span>拼版尺寸：<b>{boardInfo.size}</b> 颗</span><span>所需拼版：<b>{boardInfo.boards}</b> 块</span><span>总颗数：<b>{boardInfo.total.toLocaleString()}</b></span></div></div>}
    </aside>
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">图纸色号高亮</h2>{loading && <span className="text-sm text-pink-600">正在识别…</span>}</div><div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{message}</div><PatternPreview pattern={pattern} palette={palette} highlightedColorIds={activeIds} />{pattern && <div className="mt-4 border-t border-gray-200 pt-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">识别到的色号</h3>{activeIds.size > 0 && <button onClick={() => setActiveIds(new Set())} className="text-sm text-pink-600">显示全部</button>}</div><div className="flex flex-wrap gap-2">{usage.map(item => <button key={item.color.id} onClick={() => toggleCode(item.color.id)} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm shadow-sm transition ${activeIds.has(item.color.id) ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-300' : 'border-gray-200 bg-white hover:border-pink-300'}`}><span className="h-5 w-5 rounded border border-black/10" style={{ background: item.color.hex }} /><b>{item.color.code}</b><span className="text-gray-500">×{item.count}</span></button>)}</div></div>}</section>
  </div>;
}
