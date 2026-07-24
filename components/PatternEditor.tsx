'use client';
import { useState } from 'react';
import type { BeadPattern, CompiledBeadColor, PatchOp } from '@/lib/types/bead';
import { HistoryManager } from '@/lib/utils/history';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface Props {
  pattern: BeadPattern;
  palette: CompiledBeadColor[];
  history: HistoryManager;
  selectedColorId: string | null;
  onPatternChange: (p: BeadPattern) => void;
}

export default function PatternEditor({ pattern, palette, history, selectedColorId, onPatternChange }: Props) {
  const { t } = useI18n();
  const [replaceFrom, setReplaceFrom] = useState<string>('');
  const [replaceTo, setReplaceTo] = useState<string>('');

  const usedIds = new Set<string>();
  for (const row of pattern.cells) for (const c of row) usedIds.add(c.colorId);
  const usedColors = palette.filter(c => usedIds.has(c.id));

  const handleUndo = () => {
    const np = { ...pattern, cells: pattern.cells.map(r => [...r]) };
    history.undo(np);
    onPatternChange(np);
  };

  const handleRedo = () => {
    const np = { ...pattern, cells: pattern.cells.map(r => [...r]) };
    history.redo(np);
    onPatternChange(np);
  };

  const handleBatchReplace = () => {
    if (!replaceFrom || !replaceTo || replaceFrom === replaceTo) return;
    const ops: PatchOp[] = [];
    const np = { ...pattern, cells: pattern.cells.map(r => [...r]) };
    for (let y = 0; y < np.metadata.height; y++) {
      for (let x = 0; x < np.metadata.width; x++) {
        if (np.cells[y][x].colorId === replaceFrom) {
          ops.push({ type: 'set', row: y, col: x, oldColorId: replaceFrom, newColorId: replaceTo });
          np.cells[y][x] = { colorId: replaceTo };
        }
      }
    }
    if (ops.length) {
      history.push(ops);
      onPatternChange(np);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleUndo} disabled={!history.canUndo}>
          {t('editor.undo')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRedo} disabled={!history.canRedo}>
          {t('editor.redo')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('editor.hint')}</span>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide">{t('editor.batchTitle')}</Label>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={replaceFrom} onValueChange={setReplaceFrom}>
            <SelectTrigger className="min-w-0 flex-1">
              <SelectValue placeholder={t('editor.from')} />
            </SelectTrigger>
            <SelectContent>
              {usedColors.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.code} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">→</span>
          <Select value={replaceTo} onValueChange={setReplaceTo}>
            <SelectTrigger className="min-w-0 flex-1">
              <SelectValue placeholder={t('editor.to')} />
            </SelectTrigger>
            <SelectContent>
              {palette.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.code} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBatchReplace}
            disabled={!replaceFrom || !replaceTo || replaceFrom === replaceTo}>
            {t('editor.replaceAll')}
          </Button>
        </div>
      </div>
    </div>
  );
}
