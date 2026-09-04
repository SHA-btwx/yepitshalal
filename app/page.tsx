import Image from 'next/image';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { HalalBadge } from '@/components/HalalBadge';

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1600"
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/60 to-paper" />
        </div>

        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
          <span className="mb-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/90 backdrop-blur">
            London · Beta
          </span>
          <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Find halal food near you.
          </h1>
          <p className="mt-4 max-w-lg text-balance text-base text-white/85 sm:text-lg">
            We show you which restaurants are halal, and how we know. No guessing.
          </p>
          <div className="mt-8 w-full">
            <LocationSearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-20">
        <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
          Three simple labels
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          Every restaurant gets exactly one. And &quot;Unverified&quot; never means a place isn&apos;t
          halal — it just means we haven&apos;t checked it yet.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <HalalBadge classification="fully_halal" size="lg" />
            <p className="mt-3 text-sm text-ink/60">
              We checked it ourselves. Everything here is halal.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <HalalBadge classification="halal_options" size="lg" />
            <p className="mt-3 text-sm text-ink/60">
              Halal food is on the menu, but the kitchen also serves other things.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <HalalBadge classification="unverified" size="lg" />
            <p className="mt-3 text-sm text-ink/60">
              We haven&apos;t checked this one yet. That&apos;s all it means.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
