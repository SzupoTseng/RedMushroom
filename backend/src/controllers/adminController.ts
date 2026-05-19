import { Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { DashboardService } from '../services/dashboardService';

const reportService = new ReportService();
const dashboardService = new DashboardService();

export function getDashboard(req: Request, res: Response): void {
  const teacherId = req.user!.user_id;
  try {
    const data = dashboardService.getTeacherDashboard(teacherId);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function getClassStats(req: Request, res: Response): void {
  const teacherId = req.user!.user_id;
  try {
    const stats = dashboardService.getClassStats(teacherId);
    res.json({ stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function getStudentReport(req: Request, res: Response): void {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: '無效的 userId' });
    return;
  }

  try {
    const report = reportService.getStudentReport(userId);
    res.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function getStudentPdf(req: Request, res: Response): void {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: '無效的 userId' });
    return;
  }

  try {
    const { pdfBuffer, filename } = reportService.generatePdf(userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function exportClassCsv(req: Request, res: Response): void {
  const teacherId = req.user!.user_id;
  try {
    const { csv, filename } = dashboardService.exportCsv(teacherId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export async function generateQrCode(req: Request, res: Response): Promise<void> {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: '無效的 userId' });
    return;
  }

  try {
    const { qr_url, link_token, expires_at } = await reportService.generateMobileLinkQr(userId);
    res.json({ qr_url, link_token, expires_at });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}
