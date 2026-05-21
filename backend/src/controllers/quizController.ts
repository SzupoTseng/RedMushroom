import { Request, Response } from 'express';
import { QuizService } from '../services/quizService';
import { ReportService } from '../services/reportService';

const quizService = new QuizService();
const reportService = new ReportService();

export async function getSubjects(_req: Request, res: Response): Promise<void> {
  const subjects = quizService.getAvailableSubjects();
  res.json({ subjects });
}

export async function startQuiz(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { theory_type, subject = 'chinese' } = req.body as {
    theory_type?: string;
    subject?: string;
  };

  if (!theory_type) {
    res.status(400).json({ error: '請選擇理論主題 (theory_type)' });
    return;
  }

  const validTypes = ['cognitive', 'input', 'usage', 'sociocultural', 'mixed'];
  if (!validTypes.includes(theory_type)) {
    res.status(400).json({ error: '無效的 theory_type' });
    return;
  }

  try {
    const result = quizService.startQuiz(userId, theory_type, subject);
    // result.questions 已由 service 移除 correct_answer 欄位
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export async function submitAnswer(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { session_id, question_id, user_answer, speech_text, speech_score } = req.body as {
    session_id?: number;
    question_id?: number;
    user_answer?: string;
    speech_text?: string;
    speech_score?: number;
  };

  if (!session_id || !question_id || user_answer === undefined) {
    res.status(400).json({ error: '缺少必要欄位' });
    return;
  }

  try {
    const result = quizService.submitAnswer(
      userId, session_id, question_id, user_answer,
      speech_text, speech_score
    );
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export async function finishQuiz(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const { session_id } = req.body as { session_id?: number };

  if (!session_id) {
    res.status(400).json({ error: '缺少 session_id' });
    return;
  }

  try {
    const result = quizService.finishQuiz(userId, session_id);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function getMyReport(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  try {
    const report = reportService.getStudentReport(userId);
    res.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function getSessionResult(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  const sessionId = parseInt(req.params.sessionId, 10);

  if (isNaN(sessionId)) {
    res.status(400).json({ error: '無效的 session_id' });
    return;
  }

  try {
    const result = quizService.getSessionResult(userId, sessionId);
    if (!result) {
      res.status(404).json({ error: '找不到此測驗記錄' });
      return;
    }
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}
