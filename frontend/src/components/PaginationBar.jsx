import { ChevronLeft, ChevronRight } from 'lucide-react';

const buttonClass = 'inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3 text-xs font-medium text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function PaginationBar({ page, lastPage, onChange, disabled = false, labels }) {
  if (lastPage < 2) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#E5E2DC] pt-4">
      <p className="tabular-nums text-xs text-[#4A544D]">{labels.page(page, lastPage)}</p>
      <div className="flex gap-2">
        <button className={buttonClass} type="button" onClick={() => onChange(page - 1)} disabled={disabled || page <= 1} aria-label={labels.previousPage}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />{labels.previous}
        </button>
        <button className={buttonClass} type="button" onClick={() => onChange(page + 1)} disabled={disabled || page >= lastPage} aria-label={labels.nextPage}>
          {labels.next}<ChevronRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
