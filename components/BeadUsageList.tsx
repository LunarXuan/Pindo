'use client';
import type { BeadUsageItem } from '@/lib/types/bead';
import { usageToCsv, totalBeads } from '@/lib/utils/usage-calculator';
import { Button } from '@/components/ui/button';

interface Props { usage: BeadUsageItem[]; width?: number; height?: number; modeLabel?: string; }

function textColor(rgb: [number, number, number]) {
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return luma < 145 ? '#fff' : '#111827';
}

export default function BeadUsageList({ usage, width, height, modeLabel }: Props) {
  if (!usage.length) return null;
  const handleExportCsv = () => {
    const csv = usageToCsv(usage);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bead-usage.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
        <div>
          {width && height && <span>尺寸: {width}x{height}　</span>}
          {modeLabel && <span>模式: {modeLabel}　</span>}
          <span>总颗数: {totalBeads(usage)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="text-xs">导出用量 CSV</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {usage.map(u => (
          <div key={u.colorId} className="inline-flex items-center gap-1 border border-gray-200 bg-white px-1.5 py-1 shadow-sm">
            <span
              className="inline-flex min-w-7 items-center justify-center px-1.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: u.color.hex, color: textColor(u.color.rgb) }}
              title={u.color.name}
            >
              {u.color.code}
            </span>
            <span className="pr-1 text-xs text-gray-700">×{u.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
