import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { allRepresentativeImages } from '@/lib/representativeImages';

export const metadata: Metadata = {
  title: 'Image credits',
  description: 'Who took the example food photos shown on YepItsHalal, and the licence each is used under.',
  alternates: { canonical: '/image-credits' },
};

const BUCKET_NAME: Record<string, string> = {
  kebab: 'Kebab', biryani: 'Biryani', curry: 'Curry', shawarma: 'Shawarma', fried_chicken: 'Fried chicken',
  burgers: 'Burgers', middle_eastern: 'Middle Eastern', bakery: 'Bakery and sweets', grill: 'Grill',
  persian: 'Persian', afghan: 'Afghan', moroccan: 'Moroccan', turkish: 'Turkish', african: 'African',
  caribbean: 'Caribbean', central_asian: 'Central Asian', balkan: 'Balkan', malaysian: 'Malaysian',
  chinese: 'Chinese', indo_chinese: 'Indo-Chinese', thai: 'Thai', japanese: 'Japanese', korean: 'Korean',
  pizza: 'Pizza', italian: 'Italian', mediterranean: 'Mediterranean', fish_and_chips: 'Fish and chips',
  desserts: 'Desserts', cafe: 'Cafe', sandwiches: 'Wraps and sandwiches',
};

export default function ImageCreditsPage() {
  const groups = allRepresentativeImages().sort((a, b) => (BUCKET_NAME[a.bucket] ?? a.bucket).localeCompare(BUCKET_NAME[b.bucket] ?? b.bucket));

  return (
    <div className="mx-auto max-w-4xl px-5 pb-16 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">Image credits</h1>
      <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted">
        When a restaurant hasn&apos;t sent us its own photos, we show one of these pictures of the kind
        of food it serves, marked as an example. None of them shows a particular restaurant&apos;s
        food. Thank you to everyone who shared them.
      </p>
      <div className="mt-6 max-w-2xl rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Photos of the restaurants themselves</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          A listing shows the restaurant&apos;s own picture when it publishes one: the image it puts
          in its website&apos;s preview tag, the same one that appears when somebody shares a link to
          it. Those are credited on the listing with a link back to the site they came from, and we
          only ever take them from a restaurant&apos;s own website, never from Google, Tripadvisor or
          a delivery app.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          If you own one of those pictures and would rather we did not show it, tell us and it comes
          down the same day.{' '}
          <Link href="/submit-restaurant" className="font-semibold text-accent-ink hover:underline">
            Send us a message
          </Link>
          , or send a better photo and we will use that instead.
        </p>
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
        The example photos below are used when a restaurant publishes nothing of its own. Those from
        Wikimedia Commons are resized and used under the licence shown, which links to its terms;
        follow the title for the original. Photos from Unsplash are used under the{' '}
        <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink hover:underline">
          Unsplash licence
        </a>
        . Run a restaurant?{' '}
        <Link href="/submit-restaurant" className="font-semibold text-accent-ink hover:underline">
          Send us your own photos
        </Link>
        .
      </p>

      {groups.map(({ bucket, images }) => (
        <section key={bucket} aria-labelledby={`b-${bucket}`} className="mt-10">
          <h2 id={`b-${bucket}`} className="font-display text-xl font-semibold text-ink">
            {BUCKET_NAME[bucket] ?? bucket}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {images.map((img) => (
              <li key={img.src} className="flex gap-3 rounded-xl border border-line bg-white p-2.5">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-halal-unverifiedSoft">
                  <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0 text-xs leading-relaxed text-muted">
                  {img.source === 'wikimedia' ? (
                    <>
                      <a href={img.page} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-semibold text-ink hover:underline">
                        {img.title}
                      </a>
                      <p className="truncate">{img.author ? `By ${img.author}` : 'Author not recorded'}</p>
                      <p>
                        {img.licenceUrl ? (
                          <a href={img.licenceUrl} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                            {img.licence}
                          </a>
                        ) : (
                          img.licence
                        )}
                        {' · Wikimedia Commons'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-ink">Photo from Unsplash</p>
                      <p>Unsplash licence</p>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
