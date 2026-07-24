'use client';
import { useState, useMemo } from 'react';
import type { CompiledBeadColor } from '@/lib/types/bead';
import { useI18n } from '@/lib/i18n/context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  palette: CompiledBeadColor[];
  selectedIds: Set<string>;
  onApply: (ids: Set<string>) => void;
  onClose: () => void;
}

export default function PaletteEditor({ palette, selectedIds, onApply, onClose }: Props) {
  const { t } = useI18n();
  const [ids, setIds] = useState(() => new Set(selectedIds));
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return palette;
    const q = search.toLowerCase();
    return palette.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [palette, search]);

  const toggle = (id: string) => {
    const next = new Set(ids);
    next.has(id) ? next.delete(id) : next.add(id);
    setIds(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[90vw] max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-bold text-sm">{t('palette.edit')}</h3>
          <span className="text-xs text-muted-foreground">
            {t('palette.selected').replace('{0}', String(ids.size)).replace('{1}', String(palette.length))}
          </span>
        </div>
        <div className="px-4 pb-2 flex gap-2">
          <Input placeholder={t('color.search')} value={search} onChange={e => setSearch(e.target.value)} className="text-sm h-8" />
          <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => setIds(new Set(palette.map(c => c.id)))}>
            {t('palette.selectAll')}
          </Button>
          <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => setIds(new Set())}>
            {t('palette.deselectAll')}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(c => (
              <button key={c.id} title={`${c.code} - ${c.name}`} onClick={() => toggle(c.id)}
                className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 relative ${ids.has(c.id) ? 'border-pink-500 ring-2 ring-pink-300 dark:ring-pink-700' : 'border-gray-300 dark:border-gray-600 opacity-40'}`}
                style={{ backgroundColor: c.hex }}>
                {ids.has(c.id) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full text-white text-[8px] flex items-center justify-center">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" size="sm" onClick={onClose}>{t('palette.close')}</Button>
          <Button size="sm" onClick={() => { onApply(ids); onClose(); }}>{t('palette.apply')}</Button>
        </div>
      </div>
    </div>
  );
}
