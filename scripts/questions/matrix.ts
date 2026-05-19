import { TEMPLATES, templateRows } from './templates';
import { zhuyinize } from './zhuyin';

export interface Question {
  subject: 'chinese';
  theory_type: string;
  category_type: string;
  question_type: 'single_choice' | 'sorting';
  content: string;
  options: string;
  correct_answer: string;
  explanation: string;
  score: number;
}

export function buildQuestionMatrix(): Question[] {
  const out: Question[] = [];
  for (const t of TEMPLATES) {
    for (const v of templateRows(t)) {
      const promptText = t.prompt(v);
      out.push({
        subject: 'chinese',
        theory_type: t.theory_type,
        category_type: t.category_type,
        question_type: t.question_type,
        content: JSON.stringify(zhuyinize(promptText)),
        options: JSON.stringify(t.options(v)),
        correct_answer: t.answer,
        explanation: t.explanation(v),
        score: 10,
      });
    }
  }
  return out;
}
