// Mirrors RestaurantCard's exact box model so swapping the real card in causes
// no layout shift.
export function RestaurantCardSkeleton() {
  return (
    <div
      className="flex animate-pulse items-center gap-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:gap-4 sm:p-3.5"
      aria-hidden="true"
    >
      <div className="h-[104px] w-[104px] shrink-0 rounded-xl bg-black/[0.06] sm:h-[120px] sm:w-[120px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-5 w-2/3 rounded bg-black/[0.08]" />
        <div className="h-3 w-2/5 rounded bg-black/[0.05]" />
        <div className="h-[18px] w-24 rounded-full bg-black/[0.05]" />
        <div className="h-3 w-3/4 rounded bg-black/[0.05]" />
      </div>
    </div>
  );
}
