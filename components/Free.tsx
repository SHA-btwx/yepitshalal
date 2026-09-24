import clsx from 'clsx';

// When YepItsHalal gives something away, the word should be noticed.
//
// Shabir, 2026-09-24: a visitor "should not have to skim past the word free".
// So wherever something genuinely costs nothing (searching, the labels, a
// listing, a restaurant's first reel, the free verification queue) the word
// itself is set in the accent green, a weight heavier, on a soft highlighter
// stroke. One treatment everywhere, applied to the word only: the sentence
// around it, and what it promises, stay exactly as written.
//
// Never used to make something sound free that is not.

export function Free({
  children = 'free',
  tone = 'light',
  className,
}: {
  children?: React.ReactNode;
  /** 'dark' on the forest ground. */
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <strong className={clsx('free-mark font-semibold', tone === 'dark' ? 'free-mark-dark text-accent-onDark' : 'text-accent-ink', className)}>
      {children}
    </strong>
  );
}
