'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BeadBrand, BeadPattern, BeadUsageItem, CompiledBeadColor, DitheringMode } from '@/lib/types/bead';
import type { BackgroundMode } from '@/lib/engine/image-loader';
import type { PixelationMode } from '@/lib/engine/downscaler';
import { loadImage, imageToPixels } from '@/lib/engine/image-loader';
import { downscale } from '@/lib/engine/downscaler';
import { matchColor, matchColors } from '@/lib/engine/color-matcher';
import { applyDithering } from '@/lib/engine/dithering';
import { adjustPixels, sharpenPixels, sharpenSource } from '@/lib/engine/adjustments';
import { removeIsolatedNoise, majorityFilter } from '@/lib/engine/pattern-cleanup';
import { cropToSubject } from '@/lib/engine/subject-crop';
import { buildUsageMap, limitPaletteWithKeyColors, selectKeyColorIds } from '@/lib/engine/palette-limit';
import { loadPalette } from '@/lib/data/palettes/loader';
import { calculateUsage } from '@/lib/utils/usage-calculator';
import { recognizePatternFromImage } from '@/lib/engine/pattern-recognition';
import ImageUploader from '@/components/ImageUploader';
import ParameterPanel, { type FilterMode } from '@/components/ParameterPanel';
import PatternPreview from '@/components/PatternPreview';
import BeadUsageList from '@/components/BeadUsageList';
import ExportPanel from '@/components/ExportPanel';
import StartupNotice from '@/components/StartupNotice';
import ColorCodeHighlight from '@/components/ColorCodeHighlight';
import { CREATIVE_MODE_SETTINGS, type CreativeMode } from '@/lib/engine/creative-mode';

type WorkMode = 'generate' | 'recognize' | 'highlight';

function WorkModeSelector({ workMode, onChange }: { workMode: WorkMode; onChange: (mode: WorkMode) => void }) {
  const offset = workMode === 'generate' ? 'translate-x-0' : workMode === 'recognize' ? 'translate-x-full' : 'translate-x-[200%]';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-700">工作模式</div>
      <div className="relative grid grid-cols-3 rounded-full bg-gray-100 p-1 text-sm font-medium">
        <span className={`absolute bottom-1 left-1 top-1 w-[calc(33.333%-0.25rem)] rounded-full bg-emerald-500 shadow transition-transform ${offset}`} />
        {([
          ['generate', '图片生成图纸'],
          ['recognize', '拼豆图纸识别'],
          ['highlight', '图纸色号高亮'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`relative z-10 rounded-full px-3 py-2 transition ${workMode === mode ? 'text-white' : 'text-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {workMode === 'recognize' && (
        <p className="mt-3 text-xs leading-5 text-gray-500">
          支持上传有网格无色号，或无网格无色号的图纸；无网格时会按下方宽高颗数切分识别。
        </p>
      )}
    </div>
  );
}

function codeSeries(code: string) {
  return (code.trim().match(/^[^\d]+/)?.[0] || code.trim().charAt(0) || '').toUpperCase();
}

function applyPaletteFilters(
  palette: CompiledBeadColor[],
  seriesMode: FilterMode,
  selectedSeries: Set<string>,
  colorMode: FilterMode,
  selectedColorCodes: Set<string>,
) {
  let filtered = palette;

  if (seriesMode !== 'none' && selectedSeries.size > 0) {
    filtered = filtered.filter(color => {
      const inSeries = selectedSeries.has(codeSeries(color.code));
      return seriesMode === 'include' ? inSeries : !inSeries;
    });
  }

  if (colorMode !== 'none' && selectedColorCodes.size > 0) {
    filtered = filtered.filter(color => {
      const inColors = selectedColorCodes.has(color.code.toUpperCase());
      return colorMode === 'include' ? inColors : !inColors;
    });
  }

  return filtered.length > 0 ? filtered : palette;
}

export default function Home() {
  const [workMode, setWorkMode] = useState<WorkMode>('generate');
  const [brand, setBrand] = useState<BeadBrand>('mard');
  const [width, setWidth] = useState(35);
  const [height, setHeight] = useState(35);
  const [dithering, setDithering] = useState<DitheringMode>('none');
  const [background, setBackground] = useState<BackgroundMode>('white');
  const [brightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness] = useState(0);
  const [maxColors, setMaxColors] = useState(16);
  const [pixMode, setPixMode] = useState<PixelationMode>('average');
  const [lowResOptimize, setLowResOptimize] = useState(false);
  const [lockRatio, setLockRatio] = useState(true);
  const [creativeMode, setCreativeMode] = useState<CreativeMode>('fine');
  const [aspectRatio, setAspectRatio] = useState(1);
  const [seriesMode, setSeriesMode] = useState<FilterMode>('exclude');
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  const [colorMode, setColorMode] = useState<FilterMode>('exclude');
  const [selectedColorCodes, setSelectedColorCodes] = useState<Set<string>>(new Set());
  const [pattern, setPattern] = useState<BeadPattern | null>(null);
  const [palette, setPalette] = useState<CompiledBeadColor[]>([]);
  const [fullPalette, setFullPalette] = useState<CompiledBeadColor[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [recognitionSource, setRecognitionSource] = useState<'auto' | 'manual' | 'auto-cropped' | 'manual-cropped' | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const genId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadPalette(brand).then(colors => {
      if (cancelled) return;
      setFullPalette(colors);
    });
    return () => { cancelled = true; };
  }, [brand]);

  useEffect(() => {
    setSelectedSeries(new Set());
    setSelectedColorCodes(new Set());
  }, [brand]);

  const usage = useMemo<BeadUsageItem[]>(
    () => (pattern && palette.length ? calculateUsage(pattern, palette) : []),
    [pattern, palette]
  );

  const colorCount = useMemo(() => {
    if (!pattern) return 0;
    const ids = new Set<string>();
    for (const row of pattern.cells) for (const c of row) ids.add(c.colorId);
    return ids.size;
  }, [pattern]);

  const generate = useCallback(async (
    file: File,
    b: BeadBrand,
    w: number,
    h: number,
    dith: DitheringMode,
    bg: BackgroundMode,
    bri: number,
    con: number,
    sat: number,
    mc: number,
    pm: PixelationMode,
    sharp: number,
    lowResOpt: boolean,
    sMode: FilterMode,
    sSelected: Set<string>,
    cMode: FilterMode,
    cSelected: Set<string>,
  ) => {
    const myId = ++genId.current;
    setLoading(true);
    setStatusText('正在生成图纸...');
    try {
      const fullPal = await loadPalette(b);
      if (myId !== genId.current) return;
      setFullPalette(fullPal);

      let pal = applyPaletteFilters(fullPal, sMode, sSelected, cMode, cSelected);

      const img = await loadImage(file);
      if (myId !== genId.current) return;

      const isSmallPattern = w <= 58 && h <= 58;
      const useLowResOptimize = lowResOpt && isSmallPattern;
      const effectivePixMode: PixelationMode = useLowResOptimize ? pm : pm;
      const effectiveDithering: DitheringMode = dith;
      const effectiveMaxColors = Math.max(1, Math.min(mc, pal.length));
      const loaded = imageToPixels(img, bg);
      const prepared = useLowResOptimize
        ? cropToSubject(loaded.data, loaded.width, loaded.height, { background: bg })
        : { data: loaded.data, width: loaded.width, height: loaded.height, cropped: false, offsetX: 0, offsetY: 0 };

      sharpenSource(prepared.data, prepared.width, prepared.height, sharp);
      const pixels = downscale(
        prepared.data,
        prepared.width,
        prepared.height,
        w,
        h,
        effectivePixMode,
        useLowResOptimize ? { edgeLumaDelta: 10, dominantFill: true } : undefined
      );

      const adjusted = sharpenPixels(adjustPixels(pixels, bri, con, sat), w, h, sharp);
      const matchFn = (p: { r: number; g: number; b: number }) => {
        const c = matchColor(p, pal);
        return { r: c.rgb[0], g: c.rgb[1], b: c.rgb[2] };
      };

      const dithered = applyDithering(adjusted, w, h, effectiveDithering, matchFn);
      let matched = effectiveDithering === 'none' ? matchColors(adjusted, pal) : matchColors(dithered, pal);
      let protectedColorIds = selectKeyColorIds(pal, buildUsageMap(matched));

      if (effectiveMaxColors < pal.length) {
        const usageMap = buildUsageMap(matched);
        const limited = limitPaletteWithKeyColors(pal, usageMap, effectiveMaxColors);
        const limitedPal = limited.limitedPalette.length > 0 ? limited.limitedPalette : pal;
        if (effectiveDithering === 'none') {
          matched = matchColors(adjusted, limitedPal);
        } else {
          const limitedMatchFn = (p: { r: number; g: number; b: number }) => {
            const c = matchColor(p, limitedPal);
            return { r: c.rgb[0], g: c.rgb[1], b: c.rgb[2] };
          };
          matched = matchColors(applyDithering(adjusted, w, h, effectiveDithering, limitedMatchFn), limitedPal);
        }
        protectedColorIds = new Set(limited.protectedIds);
        for (const id of selectKeyColorIds(limitedPal, buildUsageMap(matched))) protectedColorIds.add(id);
        pal = limitedPal;
      }

      if (myId !== genId.current) return;
      setPalette(pal);

      const lumaMap = new Map(pal.map(c => [c.id, 0.2126 * c.rgb[0] + 0.7152 * c.rgb[1] + 0.0722 * c.rgb[2]]));
      const rawCells = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => ({ colorId: matched[y * w + x].id }))
      );
      const noiseCleaned = useLowResOptimize
        ? removeIsolatedNoise(rawCells, w, h, 2, protectedColorIds, lumaMap)
        : rawCells;
      const cells = useLowResOptimize ? majorityFilter(noiseCleaned, w, h) : noiseCleaned;

      setPattern({
        version: 1,
        metadata: { brand: b, width: w, height: h, dithering: effectiveDithering, background: bg, createdAt: new Date().toISOString() },
        cells,
      });
      setRecognitionSource(null);
    } finally {
      if (myId === genId.current) setLoading(false);
    }
  }, []);

  const recognize = useCallback(async (
    file: File,
    b: BeadBrand,
    w: number,
    h: number,
    sMode: FilterMode,
    sSelected: Set<string>,
    cMode: FilterMode,
    cSelected: Set<string>,
  ) => {
    const myId = ++genId.current;
    setLoading(true);
    setStatusText('正在识别拼豆图纸...');
    try {
      const fullPal = await loadPalette(b);
      if (myId !== genId.current) return;
      setFullPalette(fullPal);
      const filteredPalette = applyPaletteFilters(fullPal, sMode, sSelected, cMode, cSelected);
      const result = await recognizePatternFromImage(file, {
        brand: b,
        width: w,
        height: h,
        palette: filteredPalette,
        preferAutoGrid: true,
      });
      if (myId !== genId.current) return;
      setPalette(result.palette);
      setPattern(result.pattern);
      setWidth(result.pattern.metadata.width);
      setHeight(result.pattern.metadata.height);
      setRecognitionSource(result.gridSource);
    } finally {
      if (myId === genId.current) setLoading(false);
    }
  }, []);

  const runCurrentGenerate = useCallback((file: File) => {
    if (workMode === 'recognize') {
      recognize(
        file,
        brand,
        width,
        height,
        seriesMode,
        selectedSeries,
        colorMode,
        selectedColorCodes,
      );
      return;
    }
    generate(
      file,
      brand,
      width,
      height,
      dithering,
      background,
      brightness,
      contrast,
      saturation,
      maxColors,
      pixMode,
      sharpness,
      lowResOptimize,
      seriesMode,
      selectedSeries,
      colorMode,
      selectedColorCodes,
    );
  }, [
    background,
    brand,
    brightness,
    colorMode,
    contrast,
    dithering,
    generate,
    height,
    lowResOptimize,
    maxColors,
    pixMode,
    saturation,
    selectedColorCodes,
    selectedSeries,
    seriesMode,
    sharpness,
    width,
    workMode,
    recognize,
  ]);

  const handleImageSelected = useCallback((file: File) => {
    setImageFile(file);
    if (workMode === 'recognize') {
      recognize(file, brand, width, height, seriesMode, selectedSeries, colorMode, selectedColorCodes);
      return;
    }
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const ar = img.naturalWidth / img.naturalHeight;
      setAspectRatio(ar);
      const newH = Math.max(1, Math.min(200, Math.round(width / ar)));
      setHeight(newH);
      generate(
        file,
        brand,
        width,
        newH,
        dithering,
        background,
        brightness,
        contrast,
        saturation,
        maxColors,
        pixMode,
        sharpness,
        lowResOptimize,
        seriesMode,
        selectedSeries,
        colorMode,
        selectedColorCodes,
      );
    };
    img.src = URL.createObjectURL(file);
  }, [
    background,
    brand,
    brightness,
    colorMode,
    contrast,
    dithering,
    generate,
    lowResOptimize,
    maxColors,
    pixMode,
    saturation,
    selectedColorCodes,
    selectedSeries,
    seriesMode,
    sharpness,
    width,
    workMode,
    recognize,
  ]);

  useEffect(() => {
    if (imageFile && workMode !== 'highlight') runCurrentGenerate(imageFile);
  }, [imageFile, runCurrentGenerate]);

  const handleCreativeModeChange = useCallback((mode: CreativeMode) => {
    const settings = CREATIVE_MODE_SETTINGS[mode];
    setCreativeMode(mode);
    setPixMode(settings.pixMode);
    setDithering(settings.dithering);
    setLowResOptimize(settings.lowResOptimize);
    setContrast(settings.contrast);
    setSaturation(settings.saturation);
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-gray-900">
      <StartupNotice />
      <div className="mx-auto max-w-[1500px] px-5 py-5">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pindo 拼豆图纸生成器</h1>
            <p className="mt-1 text-sm text-gray-500">上传图片生成图纸，或识别已有无色号拼豆图纸并补全网格、色号和用量统计。</p>
            <div className="mt-3 space-y-1 text-sm font-medium text-pink-600">
              <p>本软件由金毛狗妹饲养员免费提供</p>
              <p>作者QQ：3415388638</p>
            </div>
          </div>
          {pattern && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>颜色：<b>{colorCount}</b></span>
              <span>尺寸：<b>{width}×{height}</b> 颗</span>
              <span>总颗数：<b>{(width * height).toLocaleString()}</b></span>
            </div>
          )}
        </header>

        {workMode === 'highlight' ? (
          <ColorCodeHighlight
            currentPattern={pattern}
            currentPalette={palette}
            modeSelector={<WorkModeSelector workMode={workMode} onChange={setWorkMode} />}
          />
        ) : <div className="grid gap-5 xl:grid-cols-[520px_1fr]">
          <aside className="space-y-5">
            <WorkModeSelector workMode={workMode} onChange={setWorkMode} />
            <ImageUploader onImageSelected={handleImageSelected} />
            <ParameterPanel
              brand={brand}
              recognitionMode={workMode === 'recognize'}
              width={width}
              height={height}
              dithering={dithering}
              background={background}
              maxColors={maxColors}
              lockRatio={lockRatio}
              aspectRatio={aspectRatio}
              creativeMode={creativeMode}
              fullPalette={fullPalette}
              seriesMode={seriesMode}
              selectedSeries={selectedSeries}
              colorMode={colorMode}
              selectedColorCodes={selectedColorCodes}
              onBrandChange={setBrand}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onDitheringChange={setDithering}
              onBackgroundChange={setBackground}
              onMaxColorsChange={setMaxColors}
              onLockRatioChange={setLockRatio}
              onCreativeModeChange={handleCreativeModeChange}
              onSeriesModeChange={setSeriesMode}
              onSelectedSeriesChange={setSelectedSeries}
              onColorModeChange={setColorMode}
              onSelectedColorCodesChange={setSelectedColorCodes}
            />
          </aside>

          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">图纸预览</h2>
              <div className="flex items-center gap-3">
                {loading && <span className="text-sm text-pink-600">{statusText || '处理中...'}</span>}
                {pattern && <ExportPanel pattern={pattern} palette={palette} />}
              </div>
            </div>
            {workMode === 'recognize' && pattern && recognitionSource && (
              <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                识别完成：{recognitionSource === 'auto'
                  ? '已自动识别网格'
                  : recognitionSource === 'auto-cropped'
                    ? '已裁剪空白边并自动识别网格'
                    : recognitionSource === 'manual-cropped'
                      ? '已裁剪空白边，并按当前宽高颗数均匀切分'
                      : '未检测到稳定网格，已按当前宽高颗数均匀切分'}。
              </div>
            )}

            <PatternPreview pattern={pattern} palette={palette} />

            {pattern && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <BeadUsageList
                  usage={usage}
                  width={pattern.metadata.width}
                  height={pattern.metadata.height}
                  modeLabel={CREATIVE_MODE_SETTINGS[creativeMode].label}
                />
              </div>
            )}
          </section>
        </div>}
      </div>
    </main>
  );
}
