'use client';

import { useEffect } from 'react';

// Puts keyboard and screen reader focus on a heading when the page it is on
// is the answer to something the visitor just asked for ("find the nearest
// mosque"), so the answer is what is read out first. The page does not move:
// the heading is already at the top.
export function FocusOnArrive({ id }: { id: string }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, [id]);
  return null;
}
