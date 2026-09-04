import Link from 'next/link';
import {
  SealCheckIcon,
  ForkKnifeIcon,
  SparkleIcon,
  UserIcon,
  ArrowRightIcon,
} from '@/components/icons';
import { AdminPage } from '@/components/admin/ui';

const SECTIONS = [
  {
    href: '/admin/queue',
    Icon: SealCheckIcon,
    title: 'Verification queue',
    body: 'Free and priority requests — assign, review, publish.',
  },
  {
    href: '/admin/restaurants',
    Icon: ForkKnifeIcon,
    title: 'Restaurants',
    body: 'View, edit and manage the restaurant database.',
  },
  {
    href: '/admin/offers',
    Icon: SparkleIcon,
    title: 'Yep+ offers',
    body: 'Create and manage exclusive member offers.',
  },
  {
    href: '/admin/subscriptions',
    Icon: UserIcon,
    title: 'Subscriptions',
    body: 'Basic visibility of Yep+ members.',
  },
];

export default function AdminHome() {
  return (
    <AdminPage title="Admin" description="Everything that isn't public." width="lg">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ href, Icon, title, body }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-semibold text-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{body}</span>
              </span>
              <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
