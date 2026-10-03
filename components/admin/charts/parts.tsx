'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Draws at the width it is given, so text and 2px lines never stretch. Null
 * until measured: drawing at a guessed width first pushed the page sideways on
 * a phone for a moment, so a chart holds its height and waits instead.
 */
export function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measured once straight away: a tab in the background runs no resize
    // callbacks until it is shown, and the chart should be there when it is.
    setWidth(Math.max(220, Math.round(el.getBoundingClientRect().width)));
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(220, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export interface TooltipRow {
  name: string;
  color: string;
  value: string;
}

/**
 * One readout for every series at the hovered point. The value leads and the
 * name follows, each keyed by a short stroke of its colour, never a box.
 */
export function Tooltip({
  x,
  width,
  title,
  rows,
  footer,
}: {
  x: number;
  width: number;
  title: string;
  rows: TooltipRow[];
  footer?: string;
}) {
  const boxWidth = 176;
  const left = Math.min(Math.max(x + 12, 0), width - boxWidth);
  const flip = x + 12 + boxWidth > width;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-10 w-44 rounded-xl border border-line bg-white px-3 py-2.5 text-left shadow-lg"
      style={{ left: flip ? Math.max(0, x - boxWidth - 12) : left }}
    >
      <p className="text-xs font-medium text-subtle">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="font-semibold tabular-nums text-ink">{r.value}</span>
            <span className="truncate text-muted">{r.name}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-line pt-1.5 text-xs text-muted">{footer}</p>}
    </div>
  );
}

/** Legend for two or more series. The key mirrors the mark: a line or a block. */
export function Legend({ items, mark }: { items: { name: string; color: string }[]; mark: 'line' | 'block' }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.name} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={mark === 'line' ? 'h-0.5 w-3.5 rounded-full' : 'h-2.5 w-2.5 rounded-[3px]'}
            style={{ background: i.color }}
          />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

/** Every value a chart shows, reachable without hovering anything. */
export function NumbersTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="group mt-3">
      <summary className="inline-flex min-h-[32px] cursor-pointer list-none items-center text-xs font-semibold text-accent-ink hover:underline">
        <span className="group-open:hidden">Show the numbers</span>
        <span className="hidden group-open:inline">Hide the numbers</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-sand-soft text-xs text-muted">
            <tr>
              {head.map((h, i) => (
                <th key={h} scope="col" className={`px-3 py-2 font-semibold ${i > 0 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className={`px-3 py-1.5 ${j > 0 ? 'text-right tabular-nums' : 'text-ink/85'}`}>
                    {typeof cell === 'number' ? cell.toLocaleString('en-GB') : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * Which dates to print under a chart: the first, the last, and as many in
 * between as fit with room to read them. Spaced by pixels, not by count, so a
 * phone gets three dates and a laptop gets six, and none run into each other.
 */
export function pickXTicks(n: number, xOf: (i: number) => number, minGap = 72): number[] {
  if (n === 0) return [];
  if (n === 1) return [0];
  const picked = [0];
  for (let i = 1; i < n - 1; i++) {
    if (xOf(i) - xOf(picked[picked.length - 1]) >= minGap && xOf(n - 1) - xOf(i) >= minGap) picked.push(i);
  }
  picked.push(n - 1);
  return picked;
}
