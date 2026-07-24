import { jsPDF } from 'jspdf';
import type { BeadPattern, CompiledBeadColor } from '@/lib/types/bead';
import { splitBoards, type Board } from '@/lib/utils/board-splitter';

const MM_PER_BEAD = 5; // 5mm per bead cell

export interface PdfExportOptions {
  pattern: BeadPattern;
  palette: CompiledBeadColor[];
  boardSize?: number;
  showCodes?: boolean;
}

export function exportPdf(opts: PdfExportOptions): jsPDF {
  const { pattern, palette, boardSize = 29, showCodes = true } = opts;
  const colorMap = new Map(palette.map(c => [c.id, c]));
  const boards = splitBoards(pattern, boardSize);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297, pageH = 210;
  const { width, height } = pattern.metadata;

  // === Page 1: Full overview (only when multiple boards) ===
  if (boards.length > 1) {
    doc.setFontSize(14);
    doc.text('Overview', pageW / 2, 12, { align: 'center' });
    const maxW0 = pageW - 20, maxH0 = pageH - 30;
    const overviewCell = Math.min(maxW0 / width, maxH0 / height);
    const ox = (pageW - width * overviewCell) / 2;
    const oy = 18;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = pattern.cells[r][c];
        const color = colorMap.get(cell.colorId);
        const hex = color?.hex ?? '#FF00FF';
        const rgb = hexToRgbArr(hex);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(ox + c * overviewCell, oy + r * overviewCell, overviewCell, overviewCell, 'F');
      }
    }
    // Board grid overlay
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    const bCols = Math.ceil(width / boardSize), bRows = Math.ceil(height / boardSize);
    for (let br = 0; br <= bRows; br++)
      doc.line(ox, oy + Math.min(br * boardSize, height) * overviewCell, ox + width * overviewCell, oy + Math.min(br * boardSize, height) * overviewCell);
    for (let bc = 0; bc <= bCols; bc++)
      doc.line(ox + Math.min(bc * boardSize, width) * overviewCell, oy, ox + Math.min(bc * boardSize, width) * overviewCell, oy + height * overviewCell);
    // Board labels
    doc.setFontSize(Math.max(5, overviewCell * boardSize * 0.15));
    doc.setTextColor(0);
    for (const board of boards) {
      const startC = board.col * boardSize, startR = board.row * boardSize;
      const bw = Math.min(boardSize, width - startC), bh = Math.min(boardSize, height - startR);
      const bx = ox + (startC + bw / 2) * overviewCell;
      const by = oy + (startR + bh / 2) * overviewCell + 1;
      doc.text(board.label, bx, by, { align: 'center' });
    }
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.text(
      `${pattern.metadata.brand.toUpperCase()} | ${width}×${height} | ${boards.length} boards`,
      pageW / 2, pageH - 5, { align: 'center' }
    );
  }

  // === Board detail pages ===
  boards.forEach((board, idx) => {
    if (boards.length > 1 || idx > 0) doc.addPage();

    // Calibration box (10mm x 10mm) top-left
    drawCalibrationBox(doc, 5, 5);

    // Board label
    doc.setFontSize(14);
    doc.text(`Board ${board.label}`, pageW / 2, 12, { align: 'center' });

    // Calculate cell size to fit page
    const maxW = pageW - 30, maxH = pageH - 35;
    const bRows = board.cells.length, bCols = board.cells[0]?.length ?? 0;
    const cellMM = Math.min(maxW / bCols, maxH / bRows, MM_PER_BEAD);
    const offsetX = (pageW - bCols * cellMM) / 2;
    const offsetY = 25;

    // Draw cells
    for (let r = 0; r < bRows; r++) {
      for (let c = 0; c < bCols; c++) {
        const cell = board.cells[r][c];
        const color = colorMap.get(cell.colorId);
        const x = offsetX + c * cellMM, y = offsetY + r * cellMM;

        // Fill
        const hex = color?.hex ?? '#FF00FF';
        const rgb = hexToRgbArr(hex);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(x, y, cellMM, cellMM, 'F');

        // Grid
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.1);
        doc.rect(x, y, cellMM, cellMM, 'S');

        // Code label
        if (showCodes && color && cellMM >= 4) {
          const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
          doc.setTextColor(lum > 0.5 ? 0 : 255);
          doc.setFontSize(Math.max(4, cellMM * 0.5));
          doc.text(color.code, x + cellMM / 2, y + cellMM / 2 + 0.5, { align: 'center' });
        }
      }
    }

    // Corner crosshairs for alignment
    drawCrosshair(doc, offsetX, offsetY);
    drawCrosshair(doc, offsetX + bCols * cellMM, offsetY);
    drawCrosshair(doc, offsetX, offsetY + bRows * cellMM);
    drawCrosshair(doc, offsetX + bCols * cellMM, offsetY + bRows * cellMM);

    // Footer
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.text(
      `${pattern.metadata.brand.toUpperCase()} | Board ${board.label} | ${new Date().toLocaleDateString()} | ${boards.length} boards total`,
      pageW / 2, pageH - 5, { align: 'center' }
    );
  });

  return doc;
}

function drawCalibrationBox(doc: jsPDF, x: number, y: number): void {
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(x, y, 10, 10, 'S');
  doc.setFontSize(5);
  doc.setTextColor(0);
  doc.text('10mm', x + 5, y + 5.5, { align: 'center' });
}

function drawCrosshair(doc: jsPDF, x: number, y: number): void {
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(x - 2, y, x + 2, y);
  doc.line(x, y - 2, x, y + 2);
}

function hexToRgbArr(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
