/** Sort comparator for records with an optional numeric `order`; records without one go last. */
export function byOrder(a: { order?: number }, b: { order?: number }): number {
  return (a.order ?? 999) - (b.order ?? 999);
}
