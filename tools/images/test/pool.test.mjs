import { describe, expect, it } from 'vitest';
import { pool } from '../src/pool.mjs';

describe('pool', () => {
  it('keeps order and respects the limit', async () => {
    let active = 0;
    let peak = 0;
    const results = await pool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return n * 2;
    });
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });

  it('handles an empty list', async () => {
    expect(await pool([], 4, async () => 1)).toEqual([]);
  });
});
