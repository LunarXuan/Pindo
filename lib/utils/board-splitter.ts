import type { BeadPattern, BeadCell } from '@/lib/types/bead';

export interface Board {
  label: string;
  row: number;
  col: number;
  cells: BeadCell[][];
}

export function splitBoards(pattern: BeadPattern, boardSize: number = 29): Board[] {
  const { width, height } = pattern.metadata;
  const boards: Board[] = [];
  const cols = Math.ceil(width / boardSize);
  const rows = Math.ceil(height / boardSize);

  for (let br = 0; br < rows; br++) {
    for (let bc = 0; bc < cols; bc++) {
      const label = `${String.fromCharCode(65 + br)}${bc + 1}`;
      const startRow = br * boardSize;
      const startCol = bc * boardSize;
      const endRow = Math.min(startRow + boardSize, height);
      const endCol = Math.min(startCol + boardSize, width);

      const cells: BeadCell[][] = [];
      for (let r = startRow; r < endRow; r++) {
        cells.push(pattern.cells[r].slice(startCol, endCol));
      }
      boards.push({ label, row: br, col: bc, cells });
    }
  }
  return boards;
}
