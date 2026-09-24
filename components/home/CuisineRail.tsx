import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import { Reveal } from '@/components/Reveal';
import { imageForCuisine } from '@/lib/representativeImages';
import { isOwnStorage, isUnsplash, thumbUrl, unsplashSized } from '@/lib/imageUrl';
import type { CuisineSummary } from '@/lib/cuisines';

// "I know what I want to eat." The kinds of food, as places to go.
//
// Straight after the label key on purpose: understand the labels, then choose
// the food, with nothing unrelated in between. These used to be a wrap of
// text chips with a number beside each, which read as the SEO index it also
// is. Now each kind of food is a picture of that food, from the same reviewed
// library the restaurant cards use (credited on /image-credits), a name, and
// how many places we list for it. The counts come from the catalogue; nothing
// here is rounded up or made up.
//
// A row you swipe on a phone, a grid from 768px. Pictures load lazily: this
// is below the first screen.

function tileSources(src: string): { src: string; srcSet?: string } {
  if (isUnsplash(src)) {
    return {
      src: unsplashSized(src, 480, 600),
      srcSet: `${unsplashSized(src, 360, 450)} 360w, ${unsplashSized(src, 720, 900)} 720w`,
    };
  }
  if (isOwnStorage(src)) return { src, srcSet: `${thumbUrl(src)} 320w, ${src} 960w` };
  return { src };
}

export function CuisineRail({ cuisines }: { cuisines: CuisineSummary[] }) {
  if (cuisines.length === 0) return null;
  const taken = new Set<string>();
  const tiles = cuisines.map((c) => {
    const image = imageForCuisine(c.cuisine, taken);
    return { ...c, image: image ? tileSources(image.src) : null };
  });

  return (
    <section aria-labelledby="fancy-title" className="bg-sand-soft">
      <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
        <Reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-line pt-10 sm:pt-14">
          <div>
            <h2
              id="fancy-title"
              className="text-balance font-display text-[1.8rem] font-semibold leading-[1.1] tracking-[-0.01em] text-ink sm:text-[2.4rem]"
            >
              Now, what do you fancy?
            </h2>
            <p className="mt-2.5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted sm:text-[17px]">
              Start with the food. Every place under it carries the same four labels.
            </p>
          </div>
          <Link
            href="/halal-restaurants/cuisine"
            className="group inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent-ink underline decoration-accent-ink/30 underline-offset-4 transition hover:decoration-accent-ink"
          >
            All kinds of food
            <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>

        <ul className="no-scrollbar rail-fade -mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:[mask-image:none] md:[-webkit-mask-image:none]">
          {tiles.map((t) => (
            <li key={t.slug} className="w-[40vw] max-w-[210px] shrink-0 snap-start md:w-auto md:max-w-none">
              <Link
                href={`/halal-restaurants/cuisine/${t.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-forest shadow-[0_10px_24px_-18px_rgba(11,47,58,0.55)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_34px_-18px_rgba(11,47,58,0.6)]"
              >
                {t.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.image.src}
                    srcSet={t.image.srcSet}
                    sizes="(min-width: 768px) 34vw, 70vw"
                    width={480}
                    height={600}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                  />
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <span className="absolute inset-x-3 bottom-3 sm:inset-x-3.5">
                  <span className="block font-display text-[17px] font-semibold leading-tight text-white">
                    <span className="sr-only">Halal </span>
                    {t.cuisine}
                  </span>
                  <span className="sr-only">, </span>
                  <span className="mt-0.5 block text-[13px] tabular-nums text-white/80">
                    {t.listed.toLocaleString('en-GB')} places
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
