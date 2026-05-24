import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  QuizState, QuizPhase, TheoryType, Question,
  StartQuizResponse, SubmitAnswerResponse, FinishQuizResponse,
} from '../types';
import { useAuth } from './AuthContext';

// ── Action Types ────────────────────────────────────
type QuizAction =
  | { type: 'SET_PHASE'; payload: QuizPhase }
  | { type: 'START_LOADING'; payload: { theory_type: TheoryType; subject: string } }
  | { type: 'QUESTIONS_LOADED'; payload: { session_id: number; questions: Question[] } }
  | { type: 'SUBMIT_ANSWER'; payload: { question_id: number; answer: string; is_correct: boolean } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH'; payload: { total_score: number; is_passed: boolean; exp_gained: number; praise: string; level_up: boolean; new_level: number; streak_days: number; reward: { name: string; type: 'title' | 'pet_skin' } | null } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

const initialState: QuizState = {
  phase: 'LOBBY',
  sessionId: null,
  theoryType: null,
  subject: 'chinese',
  questions: [],
  currentIndex: 0,
  answers: {},
  results: {},
  totalScore: null,
  isPassed: null,
  expGained: null,
  praise: null,
  levelUp: false,
  newLevel: null,
  streakDays: 0,
  reward: null,
  error: null,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.payload, error: null };
    case 'START_LOADING':
      return {
        ...initialState,
        phase: 'LOADING',
        theoryType: action.payload.theory_type,
        subject: action.payload.subject,
      };
    case 'QUESTIONS_LOADED':
      return {
        ...state,
        phase: 'QUIZ',
        sessionId: action.payload.session_id,
        questions: action.payload.questions,
        currentIndex: 0,
      };
    case 'SUBMIT_ANSWER':
      return {
        ...state,
        // Record answer and result; do NOT advance currentIndex here
        // QuizBoard controls timing via explicit NEXT_QUESTION dispatch
        answers: { ...state.answers, [action.payload.question_id]: action.payload.answer },
        results: { ...state.results, [action.payload.question_id]: action.payload.is_correct },
      };
    case 'NEXT_QUESTION':
      return { ...state, currentIndex: state.currentIndex + 1 };
    case 'FINISH':
      return {
        ...state,
        phase: 'RESULT',
        totalScore: action.payload.total_score,
        isPassed: action.payload.is_passed,
        expGained: action.payload.exp_gained,
        praise: action.payload.praise,
        levelUp: action.payload.level_up,
        newLevel: action.payload.new_level,
        streakDays: action.payload.streak_days,
        reward: action.payload.reward,
      };
    case 'SET_ERROR':
      return { ...state, phase: 'LOBBY', error: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────
interface QuizContextValue {
  state: QuizState;
  startQuiz: (theory_type: TheoryType, subject?: string) => Promise<void>;
  submitAnswer: (
    question_id: number,
    answer: string,
    speech?: { score: number; text: string }
  ) => Promise<boolean | null>;
  nextQuestion: () => void;
  finishQuiz: () => Promise<void>;
  resetQuiz: () => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const { token } = useAuth();

  const authFetch = useCallback(
    (url: string, options?: RequestInit) =>
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
          ...options?.headers,
        },
      }),
    [token]
  );

  const startQuiz = useCallback(
    async (theory_type: TheoryType, subject = 'chinese') => {
      dispatch({ type: 'START_LOADING', payload: { theory_type, subject } });
      try {
        const res = await authFetch('/api/quiz/start', {
          method: 'POST',
          body: JSON.stringify({ theory_type, subject }),
        });
        if (!res.ok) {
          const err = await res.json() as { error: string };
          throw new Error(err.error);
        }
        const data = await res.json() as StartQuizResponse;
        dispatch({ type: 'QUESTIONS_LOADED', payload: data });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '載入失敗' });
      }
    },
    [authFetch]
  );

  const submitAnswer = useCallback(
    async (
      question_id: number,
      answer: string,
      speech?: { score: number; text: string }
    ): Promise<boolean | null> => {
      if (!state.sessionId) return null;
      dispatch({ type: 'SET_PHASE', payload: 'SUBMITTING' });
      try {
        const res = await authFetch('/api/quiz/answer', {
          method: 'POST',
          body: JSON.stringify({
            session_id: state.sessionId,
            question_id,
            user_answer: answer,
            speech_text: speech?.text,
            speech_score: speech?.score,
          }),
        });
        const data = await res.json() as SubmitAnswerResponse;
        dispatch({
          type: 'SUBMIT_ANSWER',
          payload: { question_id, answer, is_correct: data.is_correct },
        });
        dispatch({ type: 'SET_PHASE', payload: 'QUIZ' });
        return data.is_correct;
      } catch {
        dispatch({ type: 'SET_PHASE', payload: 'QUIZ' });
        return null;
      }
    },
    [authFetch, state.sessionId]
  );

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  const finishQuiz = useCallback(async () => {
    if (!state.sessionId) return;
    try {
      const res = await authFetch('/api/quiz/finish', {
        method: 'POST',
        body: JSON.stringify({ session_id: state.sessionId }),
      });
      const data = await res.json() as FinishQuizResponse;
      dispatch({ type: 'FINISH', payload: data });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '提交失敗，請稍後再試' });
    }
  }, [authFetch, state.sessionId]);

  const resetQuiz = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <QuizContext.Provider value={{ state, startQuiz, submitAnswer, nextQuestion, finishQuiz, resetQuiz }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be used within QuizProvider');
  return ctx;
}
