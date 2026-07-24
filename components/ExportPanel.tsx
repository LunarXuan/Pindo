'use client';
import { useState } from 'react';
import type { BeadPattern, CompiledBeadColor } from '@/lib/types/bead';
import { renderPatternToCanvas, canvasToBlob, downloadBlob } from '@/lib/export/png-exporter';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { GallerySaver } from '@/lib/native/gallery-saver';

interface Props {
  pattern: BeadPattern | null;
  palette: CompiledBeadColor[];
}

export default function ExportPanel({ pattern, palette }: Props) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  if (!pattern) return null;

  const fname = `pindo-${pattern.metadata.brand}-${pattern.metadata.width}x${pattern.metadata.height}.png`;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setProgress(0);
    setMessage('');
    try {
      const canvas = await renderPatternToCanvas(pattern, palette, 60, true, true, setProgress);
      if (Capacitor.isNativePlatform()) {
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        await GallerySaver.savePng({
          fileName: fname,
          data: base64,
        });
        setMessage('已保存到手机相册');
      } else {
        const blob = await canvasToBlob(canvas);
        downloadBlob(blob, fname);
        setMessage('图纸已导出');
      }
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleExport} disabled={exporting} className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
        {exporting ? `正在导出 ${progress}%` : '保存图纸'}
      </Button>
      {message && <span className="text-xs text-emerald-600">{message}</span>}
    </div>
  );
}
