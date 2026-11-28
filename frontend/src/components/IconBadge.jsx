export default function IconBadge({ icon: Icon, tone = 'olive', large = false }) {
  const color = tone === 'bronze' ? 'bg-[#A37E5E]/[0.12] text-[#A37E5E]' : 'bg-[#2B362E]/10 text-[#2B362E]';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${large ? 'h-14 w-14' : 'h-12 w-12'} ${color}`} aria-hidden="true">
      <Icon className={large ? 'h-7 w-7' : 'h-6 w-6'} strokeWidth={1.75} />
    </span>
  );
}
