'use client';

import clsx from 'clsx';

/**
 * Submit button for a Server Action form that asks first. Deleting an offer or
 * a photo was a single unguarded click with no undo — and the photo delete sat
 * inside a hover overlay, where the pointer is already moving.
 *
 * Server-side this is still just a submit button: with JS off the form posts as
 * normal, so the action is never *blocked* by the confirm, only guarded.
 */
export function ConfirmSubmitButton({
  message,
  children,
  className,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={clsx(className)}
    >
      {children}
    </button>
  );
}
