import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import type { QuickWin } from '../../../types';
import { ensureArray } from '../utils/quickWinsHelpers';

// Helper to fetch image as base64 for Excel insertion
async function getBase64Image(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error fetching image for Excel:', e);
    return null;
  }
}

export async function exportQuickWinsToExcel(wins: QuickWin[]): Promise<void> {
  if (!wins || wins.length === 0) {
    toast.error('No hay datos para exportar');
    return;
  }

  const toastId = toast.loading('Generando reporte Excel con imágenes...');

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Quick Wins');

    // Define column headers and widths
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'FECHA', key: 'created_at', width: 14 },
      { header: 'TÍTULO', key: 'title', width: 32 },
      { header: 'ESTADO', key: 'status', width: 14 },
      { header: 'RESPONSABLE', key: 'responsible', width: 22 },
      { header: 'DESCRIPCIÓN', key: 'description', width: 42 },
      { header: 'SOLUCIÓN', key: 'proposed_solution', width: 42 },
      { header: 'FECHA LÍMITE', key: 'deadline', width: 15 },
      { header: 'CATEGORÍA', key: 'category', width: 15 },
      { header: 'CAUSA RAÍZ', key: 'cause', width: 20 },
      { header: 'IMPACTO', key: 'impact', width: 12 },
      { header: 'SCORE IMPACTO', key: 'impact_score', width: 15 },
      { header: 'SCORE ESFUERZO', key: 'effort_score', width: 15 },
      { header: 'IMAGEN ANTES', key: 'before_img', width: 26 },
      { header: 'IMAGEN DESPUÉS', key: 'after_img', width: 26 },
      { header: 'COMENTARIO CIERRE', key: 'completion_comment', width: 42 },
    ];

    // Style headers (Slate 800 background, bold white text)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Add rows and images
    for (let i = 0; i < wins.length; i++) {
      const win = wins[i];
      const row = worksheet.addRow({
        id: win.id.substring(0, 8).toUpperCase(),
        created_at: win.created_at ? new Date(win.created_at).toLocaleDateString() : 'N/A',
        title: win.title || 'Sin título',
        status: win.status === 'done' ? 'COMPLETADO' : win.status === 'in_progress' ? 'EN PROCESO' : 'IDEA',
        responsible: win.responsible || 'N/A',
        description: win.description || '',
        proposed_solution: win.proposed_solution || '',
        deadline: win.deadline ? new Date(win.deadline).toLocaleDateString() : 'N/A',
        category: (win.category || 'operacional').toUpperCase(),
        cause: (win.cause || 'infra').toUpperCase(),
        impact: win.impact || 'Medio',
        impact_score: win.impact_score ?? 5,
        effort_score: win.effort_score ?? 5,
        completion_comment: win.completion_comment || '',
      });

      // Height for image display
      row.height = 100;
      row.alignment = { vertical: 'middle', wrapText: true };

      // Add Before Image (col 14)
      const beforeUrl = ensureArray(win.image_urls)?.[0] || win.image_url;
      if (beforeUrl) {
        const base64 = await getBase64Image(beforeUrl);
        if (base64) {
          const imageId = workbook.addImage({
            base64,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: 13, row: i + 1 },
            ext: { width: 170, height: 110 },
          });
        }
      }

      // Add After Image (col 15)
      const afterUrl = ensureArray(win.completion_image_urls)?.[0] || win.completion_image_url;
      if (afterUrl) {
        const base64 = await getBase64Image(afterUrl);
        if (base64) {
          const imageId = workbook.addImage({
            base64,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: 14, row: i + 1 },
            ext: { width: 170, height: 110 },
          });
        }
      }
    }

    // Generate buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `QuickWins_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Excel generado correctamente', { id: toastId });
  } catch (error: any) {
    console.error('Error generating Excel:', error);
    toast.error('Error al generar el Excel: ' + (error?.message || ''), { id: toastId });
  }
}
