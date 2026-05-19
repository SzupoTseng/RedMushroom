import { getDb } from '../db/database';

const MILESTONES: Record<number, { name: string; type: 'title' | 'pet_skin' }> = {
  7:  { name: '七日勇者', type: 'title' },
  14: { name: '雙週達人', type: 'title' },
  30: { name: '一月傳奇', type: 'pet_skin' },
};

export class StreakRewardService {
  private db = getDb();

  /**
   * If `streakDays` is a milestone (7/14/30), grant the matching reward to the user
   * if not already owned. Returns the reward granted, or null.
   */
  unlockIfMilestone(
    userId: number,
    streakDays: number
  ): { name: string; type: 'title' | 'pet_skin' } | null {
    const milestone = MILESTONES[streakDays];
    if (!milestone) return null;

    const existing = this.db
      .prepare(`SELECT item_id FROM user_items WHERE user_id = ? AND item_name = ?`)
      .get(userId, milestone.name);
    if (existing) return null;

    this.db
      .prepare(
        `INSERT INTO user_items (user_id, item_name, item_type) VALUES (?, ?, ?)`
      )
      .run(userId, milestone.name, milestone.type);
    return milestone;
  }
}
