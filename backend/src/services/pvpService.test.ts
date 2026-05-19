import { describe, it, expect, beforeAll } from 'vitest';
import { PvpService } from './pvpService';
import { getDb } from '../db/database';

const U1 = 9301;
const U2 = 9302;

describe('PvpService', () => {
  beforeAll(() => {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO users (user_id, username, password_hash, class_id, role)
       VALUES (?, 'pvp-1', 'x', 'class-PVP', 'student')`
    ).run(U1);
    db.prepare(
      `INSERT OR REPLACE INTO users (user_id, username, password_hash, class_id, role)
       VALUES (?, 'pvp-2', 'x', 'class-PVP', 'student')`
    ).run(U2);
  });

  it('createChallenge writes a pvp_mode session with target score/secs', () => {
    const out = new PvpService().createChallenge(U1, 'cognitive', 'chinese');
    expect(out.session_id).toBeGreaterThan(0);
    expect(out.pvp_target_score).toBeGreaterThanOrEqual(60);
    expect(out.pvp_target_secs).toBeGreaterThan(0);

    const row = getDb()
      .prepare(`SELECT pvp_mode, pvp_target_score FROM quiz_sessions WHERE session_id = ?`)
      .get(out.session_id) as { pvp_mode: number; pvp_target_score: number };
    expect(row.pvp_mode).toBe(1);
    expect(row.pvp_target_score).toBe(out.pvp_target_score);
  });

  it('classmates lists same-class peers, excluding requester', () => {
    const peers = new PvpService().classmates(U1);
    expect(peers.find((p) => p.user_id === U2)).toBeDefined();
    expect(peers.find((p) => p.user_id === U1)).toBeUndefined();
  });

  it('compareResult: challenger beats target when score is much higher', () => {
    const winner = new PvpService().compareResult({
      challenger_score: 90, challenger_secs: 100,
      pvp_target_score: 70, pvp_target_secs: 200,
    });
    expect(winner).toBe('challenger');
  });

  it('compareResult: target wins when challenger is slower at same score', () => {
    const winner = new PvpService().compareResult({
      challenger_score: 70, challenger_secs: 500,
      pvp_target_score: 70, pvp_target_secs: 200,
    });
    expect(winner).toBe('target');
  });

  it('compareResult: tie when weighted scores are within 1 point', () => {
    const winner = new PvpService().compareResult({
      challenger_score: 80, challenger_secs: 100,
      pvp_target_score: 80, pvp_target_secs: 100,
    });
    expect(winner).toBe('tie');
  });
});
