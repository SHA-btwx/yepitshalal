// Mirrors RestaurantCard's exact box model so swapping the real card in causes
// no layout shift.
export function RestaurantCardSkeleton() {
  return (
    <div
      className="flex animate-pulse items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 sm:gap-4 sm:p-3"
      aria-hidden="true"
    >
      <div className="h-[76px] w-[76px] shrink-0 rounded-xl bg-black/[0.06] sm:h-[92px] sm:w-[92px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 rounded bg-black/[0.08]" />
        <div className="h-3 w-2/5 rounded bg-black/[0.05]" />
        <div className="h-[18px] w-24 rounded-full bg-black/[0.05]" />
      </div>
    </div>
  );
}
