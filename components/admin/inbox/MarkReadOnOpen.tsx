'use client';

import { useEffect } from 'react';
import { markRead } from '@/lib/admin/inbox-actions';

/** Opening a message marks it read, the way every mail app does. */
export function MarkReadOnOpen({ itemKey, unread }: { itemKey: string; unread: boolean }) {
  useEffect(() => {
    if (unread) void markRead(itemKey);
  }, [itemKey, unread]);
  return null;
}
