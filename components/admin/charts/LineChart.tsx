'use client';

import { useState } from 'react';
import { compact, longDay, niceTicks, shortDay } from '@/lib/admin/format';
import { GRID, SURFACE } from './theme';
import { Legend, NumbersTable, Tooltip, pickXTicks, useWidth } from './parts';

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

// A day-by-day line chart. One y axis only: every series here is a count of
// the same kind of thing. A vertical hairline follows the pointer and snaps to
// the nearest day, so the reader aims at a date, not at a 2px line; the arrow
// keys do the same from the keyboard.

const PAD = { top: 12, right: 14, bottom: 26, left: 44 };

export function LineChart({
  days,
  series,
  height = 240,
  label,
}: {
  /** ISO dates, oldest first, one per value. */
  days: string[];
  series: LineSeries[];
  height?: number;
  /** What the chart shows, for screen readers and the numbers table. */
  label: string;
}) {
  const { ref, width: measured } = useWidth();
  const width = measured ?? 0;
  const [active, setActive] = useState<number | null>(null);

  const n = days.length;
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const ticks = niceTicks(max, 4);
  const top = ticks[ticks.length - 1] || 1;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const line = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = (values: number[]) => `${line(values)}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

  const xTicks = pickXTicks(n, x).map((i) => ({ d: days[i], i }));

  function pick(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left;
    const i = Math.round(((px - PAD.left) / innerW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3">
          <Legend items={series} mark="line" />
        </div>
      )}
      <div ref={ref} className="relative" style={{ minHeight: height }}>
        {measured !== null && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            tabIndex={0}
            className="block touch-pan-y rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
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
                  {compact(t)}
                </text>
              </g>
            ))}
            {xTicks.map(({ d, i }) => (
              <text
                key={d}
                x={x(i)}
                y={height - 6}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                className="fill-subtle text-[11px]"
              >
                {shortDay(d)}
              </text>
            ))}

            {series[0] && <path d={area(series[0].values)} fill={series[0].color} opacity={0.08} />}
            {series.map((s) => (
              <path key={s.name} d={line(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {active === null
              ? series.map((s) => (
                  <circle key={s.name} cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
                ))
              : (
                <g>
                  <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="#9FB2B5" strokeWidth={1} />
                  {series.map((s) => (
                    <circle key={s.name} cx={x(active)} cy={y(s.values[active] ?? 0)} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
                  ))}
                </g>
              )}
          </svg>
        )}

        {measured !== null && active !== null && (
          <Tooltip
            x={x(active)}
            width={width}
            title={longDay(days[active])}
            rows={series.map((s) => ({ name: s.name, color: s.color, value: (s.values[active] ?? 0).toLocaleString('en-GB') }))}
          />
        )}
      </div>

      <NumbersTable
        caption={label}
        head={['Day', ...series.map((s) => s.name)]}
        rows={days.map((d, i) => [longDay(d), ...series.map((s) => s.values[i] ?? 0)]).reverse()}
      />
    </div>
  );
}
