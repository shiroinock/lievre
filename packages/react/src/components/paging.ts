// Page numbers for Pagination. Not exported from the package.
/** Pages to show around the current one: the ends, the current one with a neighbour on each
 *  side, and a gap (null) wherever pages are left out. A gap of one page shows the page. */
export function pageItems(current: number, total: number, siblings = 1): (number | null)[] {
  const pages = new Set([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++)
    if (p >= 1 && p <= total) pages.add(p);
  const sorted = [...pages].sort((x, y) => x - y);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev === 2) out.push(prev + 1);
    else if (prev !== undefined && p - prev > 2) out.push(null);
    out.push(p);
  });
  return out;
}
