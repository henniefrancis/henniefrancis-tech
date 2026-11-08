import { byOrder } from './by-order';

describe('byOrder', () => {
  it('orders by the order field', () => {
    expect(byOrder({ order: 1 }, { order: 2 })).toBeLessThan(0);
    expect(byOrder({ order: 2 }, { order: 1 })).toBeGreaterThan(0);
    expect(byOrder({ order: 3 }, { order: 3 })).toBe(0);
  });

  it('puts records without an order last', () => {
    expect(byOrder({}, { order: 1 })).toBeGreaterThan(0);
    expect(byOrder({ order: 1 }, {})).toBeLessThan(0);
    expect(byOrder({}, {})).toBe(0);
  });

  it('sorts a mixed list', () => {
    const list = [{ n: 'x' }, { n: 'b', order: 2 }, { n: 'y' }, { n: 'a', order: 1 }] as { n: string; order?: number }[];
    expect(list.sort(byOrder).map((r) => r.n)).toEqual(['a', 'b', 'x', 'y']);
  });
});
