'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';

interface Props {
  onImageSelected: (file: File) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function ImageUploader({ onImageSelected }: Props) {
  const { t } = useI18n();
  const uploadPrompt = Capacitor.isNativePlatform() ? '点击上传' : t('upload.drag');
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; w: number; h: number; size: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const magnifierSourceRef = useRef<HTMLCanvasElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [magnifierPosition, setMagnifierPosition] = useState<{ left: number; top: number } | null>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const cropEdgeRef = useRef<{
    edge: 'top' | 'right' | 'bottom' | 'left';
    startX: number;
    startY: number;
    crop: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const preventFileOpen = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', preventFileOpen);
    window.addEventListener('drop', preventFileOpen);
    return () => {
      window.removeEventListener('dragover', preventFileOpen);
      window.removeEventListener('drop', preventFileOpen);
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    const url = URL.createObjectURL(file);
    prevUrl.current = url;
    setPreview(url);
    setConfirmed(false);
    const img = new Image();
    img.onload = () => setMeta({ name: file.name, w: img.naturalWidth, h: img.naturalHeight, size: file.size });
    img.src = url;
    setCropOpen(true);
  }, []);

  const openPicker = () => {
    if (inputRef.current) { inputRef.current.value = ''; inputRef.current.click(); }
  };

  const prepareMagnifierSource = () => {
    const image = cropImageRef.current;
    const source = magnifierSourceRef.current;
    if (!image || !source || !image.clientWidth || !image.clientHeight) return;
    const pixelRatio = window.devicePixelRatio || 1;
    source.width = Math.round(image.clientWidth * pixelRatio);
    source.height = Math.round(image.clientHeight * pixelRatio);
    const context = source.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, source.width, source.height);
    context.drawImage(image, 0, 0, source.width, source.height);
  };

  const drawMagnifier = (focusX: number, focusY: number, event: React.PointerEvent<HTMLDivElement>) => {
    const image = cropImageRef.current;
    const source = magnifierSourceRef.current;
    const lens = magnifierCanvasRef.current;
    if (!image || !source || !lens || !source.width || !source.height) return;
    const context = lens.getContext('2d');
    if (!context) return;
    const scaleX = source.width / image.clientWidth;
    const scaleY = source.height / image.clientHeight;
    const zoom = 3;
    const lensSize = lens.width;
    const sourceWidth = (lensSize / zoom) * scaleX;
    const sourceHeight = (lensSize / zoom) * scaleY;
    const sourceLeft = focusX * scaleX - sourceWidth / 2;
    const sourceTop = focusY * scaleY - sourceHeight / 2;
    const clippedLeft = Math.max(0, sourceLeft);
    const clippedTop = Math.max(0, sourceTop);
    const clippedRight = Math.min(source.width, sourceLeft + sourceWidth);
    const clippedBottom = Math.min(source.height, sourceTop + sourceHeight);
    context.clearRect(0, 0, lensSize, lens.height);
    context.fillStyle = '#111827';
    context.fillRect(0, 0, lensSize, lens.height);
    if (clippedRight > clippedLeft && clippedBottom > clippedTop) {
      context.imageSmoothingEnabled = false;
      context.drawImage(
        source,
        clippedLeft, clippedTop, clippedRight - clippedLeft, clippedBottom - clippedTop,
        ((clippedLeft - sourceLeft) / scaleX) * zoom,
        ((clippedTop - sourceTop) / scaleY) * zoom,
        ((clippedRight - clippedLeft) / scaleX) * zoom,
        ((clippedBottom - clippedTop) / scaleY) * zoom,
      );
    }
    setMagnifierPosition({
      left: Math.max(8, Math.min(event.clientX + 24, window.innerWidth - lensSize - 12)),
      top: Math.max(8, Math.min(event.clientY - lensSize - 24, window.innerHeight - lensSize - 12)),
    });
  };

  const beginCropSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const image = cropImageRef.current;
    if (!image) return;
    const bounds = image.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width));
    const y = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height));
    cropStartRef.current = { x, y };
    setCrop({ x, y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const beginEdgeDrag = (edge: 'top' | 'right' | 'bottom' | 'left', event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    cropStartRef.current = null;
    cropEdgeRef.current = { edge, startX: event.clientX, startY: event.clientY, crop: { ...crop } };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateCropSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const image = cropImageRef.current;
    const start = cropStartRef.current;
    const edgeDrag = cropEdgeRef.current;
    if (!image) return;
    const bounds = image.getBoundingClientRect();
    if (edgeDrag) {
      const minSize = 24;
      const dx = event.clientX - edgeDrag.startX;
      const dy = event.clientY - edgeDrag.startY;
      const initial = edgeDrag.crop;
      const next = { ...initial };
      if (edgeDrag.edge === 'left') {
        const x = Math.max(0, Math.min(initial.x + dx, initial.x + initial.width - minSize));
        next.x = x;
        next.width = initial.width + initial.x - x;
      }
      if (edgeDrag.edge === 'right') next.width = Math.max(minSize, Math.min(initial.width + dx, bounds.width - initial.x));
      if (edgeDrag.edge === 'top') {
        const y = Math.max(0, Math.min(initial.y + dy, initial.y + initial.height - minSize));
        next.y = y;
        next.height = initial.height + initial.y - y;
      }
      if (edgeDrag.edge === 'bottom') next.height = Math.max(minSize, Math.min(initial.height + dy, bounds.height - initial.y));
      setCrop(next);
      const focusX = edgeDrag.edge === 'left' ? next.x : edgeDrag.edge === 'right' ? next.x + next.width : Math.max(0, Math.min(event.clientX - bounds.left, bounds.width));
      const focusY = edgeDrag.edge === 'top' ? next.y : edgeDrag.edge === 'bottom' ? next.y + next.height : Math.max(0, Math.min(event.clientY - bounds.top, bounds.height));
      drawMagnifier(focusX, focusY, event);
      return;
    }
    if (!start) return;
    const currentX = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width));
    const currentY = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height));
    setCrop({
      x: Math.min(start.x, currentX),
      y: Math.min(start.y, currentY),
      width: Math.abs(currentX - start.x),
      height: Math.abs(currentY - start.y),
    });
  };

  const finishCropSelection = () => {
    cropStartRef.current = null;
    cropEdgeRef.current = null;
    setMagnifierPosition(null);
  };

  const applyCrop = async () => {
    const image = cropImageRef.current;
    if (!image || !preview) return;
    const bounds = image.getBoundingClientRect();
    const safeCrop = crop.width > 8 && crop.height > 8
      ? crop
      : { x: 0, y: 0, width: bounds.width, height: bounds.height };
    const scaleX = image.naturalWidth / bounds.width;
    const scaleY = image.naturalHeight / bounds.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(safeCrop.width * scaleX));
    canvas.height = Math.max(1, Math.round(safeCrop.height * scaleY));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(
      image,
      safeCrop.x * scaleX, safeCrop.y * scaleY, safeCrop.width * scaleX, safeCrop.height * scaleY,
      0, 0, canvas.width, canvas.height,
    );
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const baseName = meta?.name.replace(/\.[^.]+$/, '') || 'pindo-image';
    const croppedFile = new File([blob], `${baseName}-裁切.png`, { type: 'image/png' });
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    const croppedUrl = URL.createObjectURL(croppedFile);
    prevUrl.current = croppedUrl;
    flushSync(() => {
      setPreview(croppedUrl);
      setMeta({ name: croppedFile.name, w: canvas.width, h: canvas.height, size: croppedFile.size });
      setConfirmed(true);
      setMagnifierPosition(null);
      setCropOpen(false);
    });
    requestAnimationFrame(() => onImageSelected(croppedFile));
  };

  const cancelPendingUpload = () => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    prevUrl.current = null;
    setPreview(null);
    setMeta(null);
    setCropOpen(false);
  };

  return (
    <div className="card-premium overflow-hidden">
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

      {preview && meta && confirmed ? (
        <div
          className={`relative flex cursor-copy flex-col sm:flex-row gap-6 rounded-2xl border-2 border-dashed p-5 transition ${
            dragOver
              ? 'border-pink-500 bg-pink-50 ring-4 ring-pink-200'
              : 'border-pink-200 bg-pink-50/60 hover:border-pink-400 hover:bg-pink-50'
          }`}
          onDragEnter={e => {
            e.preventDefault();
            e.stopPropagation();
            dragDepth.current += 1;
            setDragOver(true);
          }}
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setDragOver(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            e.stopPropagation();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragOver(false);
          }}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation();
            dragDepth.current = 0;
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={openPicker}
        >
          <div className="relative group shrink-0">
            <img src={preview} alt="Preview"
              draggable={false}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              className="w-full sm:w-72 h-52 object-cover rounded-2xl shadow-md ring-2 ring-pink-200 dark:ring-pink-800 pointer-events-none" />
            <div className="absolute inset-0 bg-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openPicker(); }} className="rounded-full px-4">
                ✨ {t('upload.change')}
              </Button>
            </div>
            {dragOver && (
              <div className="absolute inset-0 rounded-2xl bg-pink-500/40 backdrop-blur-sm flex items-center justify-center text-sm font-semibold text-white">
                松开以更换图片
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-3 min-w-0">
            <p className="font-medium text-sm truncate" title={meta.name}>🖼️ {meta.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-pink-400 dark:text-pink-300">
              <span>📐 {t('upload.size')}: {meta.w}×{meta.h}px</span>
              <span>📦 {t('upload.fileSize')}: {formatSize(meta.size)}</span>
            </div>
            <div className="text-xs text-pink-500">可将新图片拖拽到此区域更换图片</div>
            <Button variant="outline" size="sm" className="mt-1 self-start rounded-full border-pink-300 dark:border-pink-700 hover:bg-pink-50 dark:hover:bg-pink-950/30" onClick={(e) => { e.stopPropagation(); openPicker(); }}>
              🔄 {t('upload.change')}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`p-12 text-center cursor-pointer transition-all border-2 border-dashed rounded-2xl m-1 relative overflow-hidden ${
            dragOver
              ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30 scale-[1.01]'
              : 'border-pink-300 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-600 hover:bg-pink-50/50 dark:hover:bg-pink-950/10'
          }`}
          onDragEnter={e => { e.preventDefault(); e.stopPropagation(); dragDepth.current += 1; setDragOver(true); }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
          onDragLeave={e => { e.preventDefault(); e.stopPropagation(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); dragDepth.current = 0; setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={openPicker}
        >
          {/* 像素风装饰 */}
          <div className="absolute top-3 left-4 text-pink-200 dark:text-pink-900 text-xs select-none opacity-60">✦ ✧ ✦</div>
          <div className="absolute bottom-3 right-4 text-fuchsia-200 dark:text-fuchsia-900 text-xs select-none opacity-60">✧ ✦ ✧</div>
          <div className="absolute top-2 right-8 w-2 h-2 bg-pink-300 dark:bg-pink-800 rounded-sm rotate-45 opacity-40" />
          <div className="absolute bottom-4 left-10 w-1.5 h-1.5 bg-fuchsia-300 dark:bg-fuchsia-800 rounded-sm rotate-12 opacity-40" />
          <div className="space-y-4 relative">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-200 to-fuchsia-200 dark:from-pink-900/60 dark:to-fuchsia-900/60 text-4xl shadow-inner">
              📷
            </div>
            <p className="text-lg font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">{uploadPrompt}</p>
            <p className="text-sm text-pink-300 dark:text-pink-600">{t('upload.formats')}</p>
          </div>
        </div>
      )}

      {cropOpen && preview && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">请框选识别区域</h2>
                <p className="text-xs text-slate-500">默认选中整张图片；拖动框选区域的四条边可分别调整范围</p>
              </div>
              <button type="button" className="text-2xl text-slate-400" onClick={cancelPendingUpload} aria-label="取消上传">×</button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-slate-950 p-2">
              <div className="relative w-fit max-w-full touch-none select-none">
                <img
                  ref={cropImageRef}
                  src={preview}
                  alt="裁切预览"
                  onLoad={() => {
                    const image = cropImageRef.current;
                    if (image) {
                      setCrop({ x: 0, y: 0, width: image.clientWidth, height: image.clientHeight });
                      requestAnimationFrame(prepareMagnifierSource);
                    }
                  }}
                  className="block max-h-[58dvh] max-w-full rounded-lg object-contain"
                  draggable={false}
                />
                <div
                  className="absolute inset-0 cursor-crosshair touch-none"
                  onPointerDown={beginCropSelection}
                  onPointerMove={updateCropSelection}
                  onPointerUp={finishCropSelection}
                  onPointerCancel={finishCropSelection}
                >
                  {crop.width > 0 && crop.height > 0 && (
                    <div
                      className="absolute border-2 border-pink-400 bg-pink-400/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
                    >
                      <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-pink-500 px-2 py-0.5 text-xs text-white">识别区域</span>
                      <div className="absolute -top-3 left-0 h-6 w-full cursor-ns-resize" onPointerDown={event => beginEdgeDrag('top', event)} />
                      <div className="absolute -bottom-3 left-0 h-6 w-full cursor-ns-resize" onPointerDown={event => beginEdgeDrag('bottom', event)} />
                      <div className="absolute -left-3 top-0 h-full w-6 cursor-ew-resize" onPointerDown={event => beginEdgeDrag('left', event)} />
                      <div className="absolute -right-3 top-0 h-full w-6 cursor-ew-resize" onPointerDown={event => beginEdgeDrag('right', event)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <canvas ref={magnifierSourceRef} className="hidden" />
            <div
              className="pointer-events-none fixed z-[110] h-[120px] w-[120px] overflow-hidden rounded-full border-4 border-white bg-slate-950 shadow-2xl ring-2 ring-pink-500"
              style={magnifierPosition ?? { left: -9999, top: -9999 }}
            >
              <canvas ref={magnifierCanvasRef} width="120" height="120" className="absolute inset-0 h-full w-full" />
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-pink-400/80" />
              <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-pink-400/80" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Button variant="outline" className="w-full" onClick={openPicker}>更换图片</Button>
              <Button className="w-full bg-pink-500 hover:bg-pink-600" onClick={applyCrop}>确认识别</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
