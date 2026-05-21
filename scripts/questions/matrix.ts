import { TEMPLATES, templateRows, pickPrompt } from './templates';
import { zhuyinize } from './zhuyin';
import { shuffleSingleChoice } from './shuffle';

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
    let rowIdx = 0;
    for (const v of templateRows(t)) {
      const promptFn = pickPrompt(t, rowIdx);
      const promptText = promptFn(v);
      const rawOptions = t.options(v);
      const { options: shuffledOptions, answer: shuffledAnswer } =
        shuffleSingleChoice(rawOptions, t.answer);
      out.push({
        subject: 'chinese',
        theory_type: t.theory_type,
        category_type: t.category_type,
        question_type: t.question_type,
        content: JSON.stringify(zhuyinize(promptText)),
        options: JSON.stringify(shuffledOptions),
        correct_answer: shuffledAnswer,
        explanation: t.explanation(v),
        score: 10,
      });
      rowIdx++;
    }
  }
  return out;
}
