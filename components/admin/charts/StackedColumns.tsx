'use client';

import { useState } from 'react';
import { longDay, niceTicks, shortDay } from '@/lib/admin/format';
import { GRID } from './theme';
import { Legend, NumbersTable, Tooltip, pickXTicks, useWidth } from './parts';

// Columns per day, stacked by series. Each column is at most 24px wide and
// never fills its slot; a 2px gap in the surface colour separates the stacked
// segments; only the top of a column is rounded. The whole day's slot is the
// hover target, not just the painted pixels, so a one-message day is as easy
// to point at as a busy one.

const PAD = { top: 12, right: 6, bottom: 26, left: 32 };
const GAP = 2;
const RADIUS = 4;

function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function StackedColumns({
  days,
  series,
  values,
  height = 220,
  label,
}: {
  days: string[];
  series: { name: string; color: string }[];
  /** values[day][series] */
  values: number[][];
  height?: number;
  label: string;
}) {
  const { ref, width: measured } = useWidth();
  const width = measured ?? 0;
  const [active, setActive] = useState<number | null>(null);

  const n = days.length;
  const totals = values.map((v) => v.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(Math.max(0, ...totals), 3);
  const top = ticks[ticks.length - 1] || 1;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, n);
  const colW = Math.max(3, Math.min(24, slot * 0.62));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const labelled = new Set(pickXTicks(n, (i) => PAD.left + slot * i + slot / 2));

  return (
    <div>
      <div className="mb-3">
        <Legend items={series} mark="block" />
      </div>
      <div ref={ref} className="relative" style={{ minHeight: height }}>
        {measured !== null && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            tabIndex={0}
            className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((a) => a ?? n - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n - 1) - 1));
              else if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? 0) + 1));
              else if (e.key === 'Escape') setActive(null);
              else return;
              e.preventDefault();
            }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}

            {values.map((dayValues, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              const x0 = cx - colW / 2;
              let base = 0;
              const lastNonZero = dayValues.reduce((last, v, s) => (v > 0 ? s : last), -1);
              return (
                <g key={days[i]} opacity={active === null || active === i ? 1 : 0.45}>
                  {dayValues.map((v, s) => {
                    if (v <= 0) return null;
                    const y1 = y(base + v);
                    const y0 = y(base);
                    base += v;
                    // The gap comes out of the segment above, so the stack's
                    // total height still matches the axis.
                    const h = Math.max(1, y0 - y1 - (s === 0 ? 0 : GAP));
                    return s === lastNonZero ? (
                      <path key={s} d={topRounded(x0, y1, colW, h, RADIUS)} fill={series[s].color} />
                    ) : (
                      <rect key={s} x={x0} y={y1} width={colW} height={h} fill={series[s].color} />
                    );
                  })}
                  <rect
                    x={PAD.left + slot * i}
                    y={PAD.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                  />
                </g>
              );
            })}

            {days.map((d, i) =>
              labelled.has(i) ? (
                <text
                  key={d}
                  x={PAD.left + slot * i + slot / 2}
                  y={height - 6}
                  textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                  className="fill-subtle text-[11px]"
                >
                  {shortDay(d)}
                </text>
              ) : null
            )}
          </svg>
        )}

        {measured !== null && active !== null && (
          <Tooltip
            x={PAD.left + slot * active + slot / 2}
            width={width}
            title={longDay(days[active])}
            rows={series.map((s, j) => ({ name: s.name, color: s.color, value: String(values[active][j] ?? 0) }))}
            footer={`${totals[active]} in all`}
          />
        )}
      </div>

      <NumbersTable
        caption={label}
        head={['Day', ...series.map((s) => s.name), 'All']}
        rows={days.map((d, i) => [longDay(d), ...values[i], totals[i]]).reverse()}
      />
    </div>
  );
}
