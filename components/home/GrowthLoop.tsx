import Link from 'next/link';
import { ArrowRightIcon, ListIcon, MailIcon, MapPinIcon } from '@/components/icons';
import { NotifyMeForm } from '@/components/NotifyMeForm';
import { Free } from '@/components/Free';
import { Reveal } from '@/components/Reveal';

// Where YepItsHalal goes next is decided by who asks.
//
// This was a mailing list with a heading ("Where should we go next?") and a
// promise. It is really the product's growth loop, so it now says so: you
// tell us where, every request is counted per place, the places asked for
// most come first, and you hear once when we arrive. That is exactly what
// the form does. /api/subscribe stores the place and the address,
// /admin/demand tallies requests by place, and the confirmation names the
// place you asked for.
//
// It keeps the #next-cities anchor: the "Tell us where you're looking" link
// at the foot of the first screen, and the Beta chip in the header, both
// land here. No Reveal on the section itself, because a reader who jumps
// straight to it should never catch it mid-fade.
//
// The other two ways the catalogue grows sit underneath: adding a place we
// are missing, and a restaurant listing itself, which is free.

const LOOP = [
  { Icon: MapPinIcon, title: 'You tell us where', body: 'A city, a town or a country. Anywhere you would use this.' },
  { Icon: ListIcon, title: 'Every request is counted', body: 'The more people ask for a place, the sooner we go there.' },
  { Icon: MailIcon, title: 'We tell you when', body: 'One email when YepItsHalal reaches it. Nothing else.' },
];

export function GrowthLoop() {
  return (
    <section id="next-cities" aria-labelledby="next-cities-title" className="scroll-mt-24 border-y border-sand-line bg-sand">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <h2
            id="next-cities-title"
            className="text-balance font-display text-[1.8rem] font-semibold leading-[1.1] tracking-[-0.01em] text-ink sm:text-[2.4rem]"
          >
            Don&apos;t see your area yet?
          </h2>
          <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-ink/75 sm:text-[17px]">
            YepItsHalal is London only for now. Tell us where you&apos;re looking, and help decide where it
            goes next.
          </p>

          <ol className="mt-7 space-y-4">
            {LOOP.map(({ Icon, title, body }, i) => (
              <li key={title} className="relative flex gap-4">
                {i < LOOP.length - 1 && (
                  <span aria-hidden="true" className="absolute left-5 top-11 h-[calc(100%-1.5rem)] w-px bg-spice/25" />
                )}
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-spice-ink ring-1 ring-sand-line">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="pt-1">
                  <span className="block text-[15px] font-semibold text-ink">{title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:pt-2">
          <div className="rounded-2xl bg-white p-5 shadow-[0_18px_40px_-28px_rgba(18,68,82,0.45)] ring-1 ring-sand-line sm:p-7">
            <NotifyMeForm
              source="homepage expansion footer"
              placeFirst
              cityLabel="Where should we go next?"
              cityPlaceholder="A city or country, e.g. Manchester"
              emailLabel="Your email"
              buttonLabel="Send my request"
              doneTitle="Counted"
              doneWithPlace="{place} is on the list. We'll email you when YepItsHalal gets there, and never for anything else."
              doneBody="You're on the list. We'll email you when YepItsHalal reaches somewhere new, and never for anything else."
              privacyLine="One address, used for this and nothing else. Never sold. Unsubscribe in a click."
            />
          </div>

          <Reveal as="div" className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Link href="/submit-restaurant" className="group block rounded-xl py-1">
              <span className="block text-sm font-semibold text-ink">Know a halal place we&apos;re missing?</span>
              <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink underline decoration-accent-ink/30 underline-offset-4 transition group-hover:decoration-accent-ink">
                Add it
                <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
            <Link href="/partners" className="group block rounded-xl py-1">
              <span className="block text-sm font-semibold text-ink">
                Run a restaurant? Listing is <Free>free</Free>.
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink underline decoration-accent-ink/30 underline-offset-4 transition group-hover:decoration-accent-ink">
                For restaurants
                <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
