'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { BeadBrand, CompiledBeadColor, DitheringMode } from '@/lib/types/bead';
import type { BackgroundMode } from '@/lib/engine/image-loader';
import type { CreativeMode } from '@/lib/engine/creative-mode';
import { CREATIVE_MODE_SETTINGS } from '@/lib/engine/creative-mode';
import { getAvailableBrands } from '@/lib/data/palettes/loader';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export type FilterMode = 'none' | 'include' | 'exclude';

interface Props {
  brand: BeadBrand;
  recognitionMode?: boolean;
  width: number;
  height: number;
  dithering: DitheringMode;
  background: BackgroundMode;
  maxColors: number;
  lockRatio: boolean;
  aspectRatio: number;
  creativeMode: CreativeMode;
  fullPalette: CompiledBeadColor[];
  seriesMode: FilterMode;
  selectedSeries: Set<string>;
  colorMode: FilterMode;
  selectedColorCodes: Set<string>;
  onBrandChange: (b: BeadBrand) => void;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
  onDitheringChange: (d: DitheringMode) => void;
  onBackgroundChange: (bg: BackgroundMode) => void;
  onMaxColorsChange: (v: number) => void;
  onLockRatioChange: (v: boolean) => void;
  onCreativeModeChange: (v: CreativeMode) => void;
  onSeriesModeChange: (v: FilterMode) => void;
  onSelectedSeriesChange: (v: Set<string>) => void;
  onColorModeChange: (v: FilterMode) => void;
  onSelectedColorCodesChange: (v: Set<string>) => void;
}

function codeSeries(code: string) {
  return (code.trim().match(/^[^\d]+/)?.[0] || code.trim().charAt(0) || '').toUpperCase();
}

function brandLabel(brand: BeadBrand) {
  const map: Partial<Record<BeadBrand, string>> = {
    'artkal-s': 'Artkal S',
    coco: 'COCO',
    hama: 'Hama',
    manman: '漫漫',
    mard: 'MARD',
    mixiaowo: '咪小窝',
    panpan: '盼盼',
    perler: 'Perler',
  };
  return map[brand] ?? brand;
}

function FilterModeSelect({ value, onChange }: { value: FilterMode; onChange: (v: FilterMode) => void }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as FilterMode)}>
      <SelectTrigger className="h-11 w-32 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="include">有</SelectItem>
        <SelectItem value="exclude">没有</SelectItem>
      </SelectContent>
    </Select>
  );
}

function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1 text-xs transition ${
        active
          ? 'border-pink-500 bg-pink-50 text-pink-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function ParameterPanel(props: Props) {
  const brands = getAvailableBrands();
  const [showSeries, setShowSeries] = useState(false);
  const [colorInput, setColorInput] = useState('');

  const boardSize = 29;
  const boardCols = Math.ceil(props.width / boardSize);
  const boardRows = Math.ceil(props.height / boardSize);
  const boardCount = boardCols * boardRows;
  const totalBeads = props.width * props.height;

  const seriesList = useMemo(() => {
    return [...new Set(props.fullPalette.map(c => codeSeries(c.code)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [props.fullPalette]);

  const handleWidthChange = (w: number) => {
    props.onWidthChange(w);
    if (props.lockRatio && props.aspectRatio > 0) {
      props.onHeightChange(Math.max(1, Math.min(200, Math.round(w / props.aspectRatio))));
    }
  };

  const handleHeightChange = (h: number) => {
    props.onHeightChange(h);
    if (props.lockRatio && props.aspectRatio > 0) {
      props.onWidthChange(Math.max(1, Math.min(200, Math.round(h * props.aspectRatio))));
    }
  };

  const clampSize = (value: number) => Math.max(1, Math.min(200, Math.round(value)));

  const toggleSeries = (series: string) => {
    const next = new Set(props.selectedSeries);
    if (next.has(series)) next.delete(series);
    else next.add(series);
    props.onSelectedSeriesChange(next);
  };

  const addColorCode = () => {
    const code = colorInput.trim().toUpperCase();
    if (!code) return;
    const next = new Set(props.selectedColorCodes);
    next.add(code);
    props.onSelectedColorCodesChange(next);
    setColorInput('');
  };

  const removeColorCode = (code: string) => {
    const next = new Set(props.selectedColorCodes);
    next.delete(code);
    props.onSelectedColorCodesChange(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5">
        <div className={`grid gap-4 ${props.recognitionMode ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <div className="space-y-2">
            <Label>品牌</Label>
            <Select value={props.brand} onValueChange={v => props.onBrandChange(v as BeadBrand)}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {brands.map(b => <SelectItem key={b} value={b}>{brandLabel(b)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!props.recognitionMode && (
            <div className="space-y-2">
              <Label>创作模式</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CREATIVE_MODE_SETTINGS) as CreativeMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => props.onCreativeModeChange(mode)}
                    className={`h-11 rounded-lg border text-sm font-medium transition ${
                      props.creativeMode === mode
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 bg-white hover:border-pink-300'
                    }`}
                  >
                    {CREATIVE_MODE_SETTINGS[mode].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>背景</Label>
            <Select value={props.background} onValueChange={v => props.onBackgroundChange(v as BackgroundMode)}>
              <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="white">白色</SelectItem>
                <SelectItem value="black">黑色</SelectItem>
                <SelectItem value="transparent">透明</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!props.recognitionMode && (
          <div className="grid gap-4 md:grid-cols-[9rem_1fr] md:items-center">
            <Label className="text-base">抖动优化</Label>
            <button
              type="button"
              role="switch"
              aria-checked={props.dithering === 'floyd-steinberg'}
              onClick={() => props.onDitheringChange(props.dithering === 'floyd-steinberg' ? 'none' : 'floyd-steinberg')}
              className={`relative h-7 w-14 rounded-full transition-colors ${
                props.dithering === 'floyd-steinberg' ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  props.dithering === 'floyd-steinberg' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {!props.recognitionMode ? (
          <div className="grid gap-4 md:grid-cols-[9rem_1fr] md:items-center">
            <Label className="text-base">颜色数量</Label>
            <div className="space-y-2">
              <Slider min={1} max={50} step={1} value={[props.maxColors]} onValueChange={([v]) => props.onMaxColorsChange(v)} />
              <div className="text-sm text-gray-700">目标颜色： <span className="font-semibold">{props.maxColors}</span></div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            识别模式会按原图实际识别出的颜色数量生成图纸，不再限制颜色数。
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[9rem_8rem_1fr] md:items-center">
          <Label className="text-base">色系筛选</Label>
          <FilterModeSelect value={props.seriesMode} onChange={props.onSeriesModeChange} />
          <button
            type="button"
            onClick={() => setShowSeries(v => !v)}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-700"
          >
            {props.selectedSeries.size ? [...props.selectedSeries].join('、') : '点击选择色系'}
          </button>
        </div>

        {showSeries && (
          <div className="ml-0 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 md:ml-36">
            {seriesList.map(series => (
              <Chip key={series} active={props.selectedSeries.has(series)} onClick={() => toggleSeries(series)}>
                {series}
              </Chip>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[9rem_8rem_1fr] md:items-center">
          <Label className="text-base">单色筛选</Label>
          <FilterModeSelect value={props.colorMode} onChange={props.onColorModeChange} />
          <div className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <input
              value={colorInput}
              onChange={e => setColorInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addColorCode();
                }
              }}
              placeholder="可输入单个色号后按回车录入，点击已录入色号可删除"
              className="w-full bg-transparent text-sm outline-none"
            />
            {props.selectedColorCodes.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {[...props.selectedColorCodes].map(code => (
                  <Chip key={code} active onClick={() => removeColorCode(code)}>{code} ×</Chip>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[9rem_1fr] md:items-center">
          <Label className="text-base">宽度</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Slider className="flex-1" min={1} max={200} step={1} value={[props.width]} onValueChange={([v]) => handleWidthChange(v)} />
              {!props.recognitionMode && <label className="flex shrink-0 items-center gap-1 text-sm text-gray-500"><input type="number" min={1} max={200} value={props.width} onChange={e => handleWidthChange(clampSize(Number(e.target.value) || 1))} className="h-9 w-16 rounded-lg border border-pink-200 bg-white px-2 text-center font-semibold text-gray-800 outline-none focus:border-pink-500" /><span>颗</span></label>}
            </div>
            <div className="text-sm text-gray-700">宽度： <span className="font-semibold">{props.width}</span> 颗</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[9rem_1fr] md:items-center">
          <Label className="text-base">高度</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Slider className="flex-1" min={1} max={200} step={1} value={[props.height]} onValueChange={([v]) => handleHeightChange(v)} />
              {!props.recognitionMode && <label className="flex shrink-0 items-center gap-1 text-sm text-gray-500"><input type="number" min={1} max={200} value={props.height} onChange={e => handleHeightChange(clampSize(Number(e.target.value) || 1))} className="h-9 w-16 rounded-lg border border-pink-200 bg-white px-2 text-center font-semibold text-gray-800 outline-none focus:border-pink-500" /><span>颗</span></label>}
            </div>
            <div className="text-sm text-gray-700">高度： <span className="font-semibold">{props.height}</span> 颗</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <label className="flex cursor-pointer items-center gap-2">
            <Switch checked={props.lockRatio} onCheckedChange={props.onLockRatioChange} />
            锁定比例
          </label>
          <span>拼版尺寸：{boardSize}×{boardSize}</span>
          <span>所需拼版：<b>{boardCount}</b> 块</span>
          <span>总颗数：<b>{totalBeads.toLocaleString()}</b> 颗</span>
        </div>
      </div>
    </div>
  );
}
