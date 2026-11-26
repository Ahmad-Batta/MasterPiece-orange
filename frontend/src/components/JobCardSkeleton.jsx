export default function JobCardSkeleton() {
  return (
    <div className="surface-card animate-pulse" aria-hidden="true">
      <div className="h-6 w-3/4 rounded-lg bg-[#E5E2D9]/60" />
      <div className="mt-6 h-4 w-1/2 rounded-lg bg-[#E5E2D9]/60" />
      <div className="mt-4 h-4 w-2/3 rounded-lg bg-[#E5E2D9]/60" />
      <div className="mt-8 h-4 w-1/3 rounded-lg bg-[#E5E2D9]/60" />
    </div>
  );
}
