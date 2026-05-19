import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { StreakRewardService } from './streakRewardService';
import { getDb } from '../db/database';

const USER = 9201;

describe('StreakRewardService.unlockIfMilestone', () => {
  beforeAll(() => {
    getDb()
      .prepare(`INSERT OR REPLACE INTO users (user_id, username, password_hash) VALUES (?, 'streak', 'x')`)
      .run(USER);
  });

  beforeEach(() => {
    getDb().prepare(`DELETE FROM user_items WHERE user_id = ?`).run(USER);
  });

  it('unlocks "七日勇者" at streak 7', () => {
    const reward = new StreakRewardService().unlockIfMilestone(USER, 7);
    expect(reward).toEqual({ name: '七日勇者', type: 'title' });
    const rows = getDb()
      .prepare(`SELECT item_name FROM user_items WHERE user_id = ?`)
      .all(USER) as Array<{ item_name: string }>;
    expect(rows.map((r) => r.item_name)).toContain('七日勇者');
  });

  it('unlocks pet_skin at streak 30', () => {
    const reward = new StreakRewardService().unlockIfMilestone(USER, 30);
    expect(reward).toEqual({ name: '一月傳奇', type: 'pet_skin' });
  });

  it('is idempotent — running twice at the same milestone returns null the second time', () => {
    const svc = new StreakRewardService();
    expect(svc.unlockIfMilestone(USER, 7)).not.toBeNull();
    expect(svc.unlockIfMilestone(USER, 7)).toBeNull();
    const n = (getDb()
      .prepare(`SELECT COUNT(*) AS n FROM user_items WHERE user_id = ?`)
      .get(USER) as { n: number }).n;
    expect(n).toBe(1);
  });

  it('returns null at a non-milestone streak', () => {
    expect(new StreakRewardService().unlockIfMilestone(USER, 5)).toBeNull();
    const n = (getDb()
      .prepare(`SELECT COUNT(*) AS n FROM user_items WHERE user_id = ?`)
      .get(USER) as { n: number }).n;
    expect(n).toBe(0);
  });
});
