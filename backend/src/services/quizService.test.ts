import { describe, it, expect, beforeAll } from 'vitest';
import { QuizService } from './quizService';
import { getDb } from '../db/database';

describe('pickPraise (SEN-aware)', () => {
  beforeAll(() => {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO users
       (user_id, username, password_hash, is_sen_mode)
       VALUES (9001, 'sen-user-test', 'x', 1)`
    ).run();
    db.prepare(
      `INSERT OR REPLACE INTO users
       (user_id, username, password_hash, is_sen_mode)
       VALUES (9002, 'normal-user-test', 'x', 0)`
    ).run();

    db.prepare(`DELETE FROM user_praise_history WHERE user_id IN (9001, 9002)`).run();

    db.prepare(
      `INSERT OR IGNORE INTO praise_library (scenario_type, tone_type, content)
       VALUES ('sen_encouragement', 'growth_mindset', 'TEST_SEN_PRAISE_MARKER')`
    ).run();
  });

  it('returns sen_encouragement scenario when user.is_sen_mode = 1', () => {
    const svc = new QuizService();
    const sample = new Set<string>();
    // Run several times to be confident we hit the sen pool only
    for (let i = 0; i < 20; i++) {
      const txt = (svc as unknown as { pickPraise: (u: number, p: boolean) => string })
        .pickPraise(9001, true);
      sample.add(txt);
    }
    // None of the samples should be a generic "passed" praise that mentions trophies
    // — a sanity check that we did switch pools.
    const senRow = getDb()
      .prepare(`SELECT content FROM praise_library WHERE scenario_type='sen_encouragement'`)
      .all() as Array<{ content: string }>;
    const senSet = new Set(senRow.map((r) => r.content));
    for (const s of sample) {
      expect(senSet.has(s) || s === '做得很好！繼續加油！').toBe(true);
    }
  });

  it('returns passed/failed scenarios for non-SEN users', () => {
    const svc = new QuizService();
    const txt = (svc as unknown as { pickPraise: (u: number, p: boolean) => string })
      .pickPraise(9002, true);
    const senRow = getDb()
      .prepare(`SELECT content FROM praise_library WHERE scenario_type='sen_encouragement'`)
      .all() as Array<{ content: string }>;
    const senSet = new Set(senRow.map((r) => r.content));
    // Should NOT be drawn from the SEN pool
    expect(senSet.has(txt)).toBe(false);
  });
});
