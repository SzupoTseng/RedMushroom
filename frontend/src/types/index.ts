// ── 使用者 ──────────────────────────────────
export interface User {
  user_id: number;
  username: string;
  display_name: string;
  role: 'student' | 'teacher' | 'parent';
  grade: string;
  total_exp: number;
  current_level: number;
  streak_days: number;
  max_streak: number;
  is_sen_mode: boolean;
}

// ── 題目（前端收到，已無 correct_answer）──────
export interface ZhuyinChar {
  char: string;
  pinyin: string;
}

export interface Question {
  question_id: number;
  theory_type: TheoryType;
  category_type: CategoryType;
  question_type: QuestionType;
  content: ZhuyinChar[];
  options: Record<string, string>;
  score: number;
  subject: string;
}

// ── 後端帶 correct_answer 的完整題目（結果頁）──
export interface QuestionWithAnswer extends Question {
  correct_answer: string;
  explanation: string;
}

// ── 型別聯合 ─────────────────────────────────
export type TheoryType = 'cognitive' | 'input' | 'usage' | 'sociocultural';
export type CategoryType =
  | 'food_shopping' | 'social' | 'travel' | 'business'
  | 'health' | 'leisure' | 'housing' | 'digital';
export type QuestionType = 'single_choice' | 'sorting';

// ── 測驗狀態機 ────────────────────────────────
export type QuizPhase =
  | 'LOBBY'       // 選主題
  | 'LOADING'     // 載入題目
  | 'QUIZ'        // 作答中
  | 'SUBMITTING'  // 提交中
  | 'RESULT';     // 結果頁

export interface QuizState {
  phase: QuizPhase;
  sessionId: number | null;
  theoryType: TheoryType | null;
  subject: string;
  questions: Question[];
  currentIndex: number;
  answers: Record<number, string>; // question_id → user_answer
  results: Record<number, boolean>; // question_id → is_correct
  totalScore: number | null;
  isPassed: boolean | null;
  expGained: number | null;
  praise: string | null;
  levelUp: boolean;
  newLevel: number | null;
  error: string | null;
}

// ── 五維度 ────────────────────────────────────
export interface UserStats {
  accuracy: number;
  stability: number;
  versatility: number;
  cognition: number;
  endurance: number;
  fluency: number;
}

// ── API 回應 ──────────────────────────────────
export interface StartQuizResponse {
  session_id: number;
  questions: Question[];
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  explanation: string;
}

export interface FinishQuizResponse {
  total_score: number;
  is_passed: boolean;
  exp_gained: number;
  praise: string;
  level_up: boolean;
  new_level: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
