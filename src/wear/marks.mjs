// Print marks drawn from a salt: the worn rule and the chart dashes.
// Shared by the baked CSS (scripts/build-wear.mjs) and the live provider, so both modes agree.
import { mulberry32, seedFor } from './seed.mjs';

export function printMarks(salt) {
  const next = mulberry32(seedFor(salt, 'print'));
  // Two draws went to the misregistration, now dropped; spending them keeps the rules in place.
  next();
  next();
  const runs = Array.from({ length: 5 }, () => Math.round(20 + next() * 60));
  const dash = Array.from({ length: 6 }, (_, i) =>
    i % 2 ? 1 + Math.round(next() * 2) : Math.round(8 + next() * 40),
  ).join(' ');
  let at = 0;
  const stops = runs.flatMap((run, i) => {
    const line = `#000 ${at}px ${at + run}px`;
    at += run;
    const [colour, width] = i % 2 ? ['#0005', 12] : ['transparent', 3];
    const gap = `${colour} ${at}px ${at + width}px`;
    at += width;
    return [line, gap];
  });
  return { rule: `repeating-linear-gradient(90deg, ${stops.join(', ')})`, dash };
}
