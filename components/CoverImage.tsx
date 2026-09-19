'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { ForkKnifeIcon } from './icons';
import { isBusinessLogo } from '@/lib/types';

// Every picture on this site is one of three things: the restaurant's own photo,
// the restaurant's own logo taken from its website, or a labelled example of
// the kind of food it serves. All three come from somewhere we do not control,
// and any of them can hand back something a browser cannot decode. The default
// result is the broken-image glyph in the middle of a card, which looks like
// the site is broken rather than one file, so a failure falls back to a plain
// tinted tile instead.
//
// A logo is never cropped to fill. Cropping a wordmark to a square makes it
// read as a photograph of the food, which it is not.

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
  const logo = isBusinessLogo(src);

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
      className={clsx(logo ? 'bg-white object-contain p-2' : 'object-cover', className)}
    />
  );
}
