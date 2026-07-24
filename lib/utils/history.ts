import type { BeadPattern, PatchOp, HistoryEntry } from '@/lib/types/bead';

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize = 100;

  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(pattern: BeadPattern): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    for (const op of entry) {
      pattern.cells[op.row][op.col].colorId = op.oldColorId;
    }
    this.redoStack.push(entry);
    return entry;
  }

  redo(pattern: BeadPattern): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    for (const op of entry) {
      pattern.cells[op.row][op.col].colorId = op.newColorId;
    }
    this.undoStack.push(entry);
    return entry;
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  clear(): void { this.undoStack = []; this.redoStack = []; }
}
