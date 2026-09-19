'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { ForkKnifeIcon } from './icons';

// Every picture on this site is either the restaurant's own or a labelled
// example of the kind of food it serves, and both come from somewhere we do not
// control: Supabase storage, Unsplash, or Vercel's image optimiser in front of
// them. Any one of those can hand back something a browser cannot decode, and
// the default result is the browser's broken-image glyph in the middle of a
// card, which looks like the site is broken rather than one file.
//
// So a failure falls back to a plain tinted tile. It says nothing it cannot
// back up, and it keeps the row the same shape.

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-halal-unverifiedSoft" aria-hidden="true">
        <ForkKnifeIcon className="h-1/3 w-1/3 text-subtle/50" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={clsx('object-cover', className)}
    />
  );
}
