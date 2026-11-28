import { useState } from 'react';

export default function ProfileAvatar({ src, name, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const initials = name?.trim().split(/\s+/).slice(0, 2)
    .map((part) => Array.from(part)[0]).join('').toLocaleUpperCase() || '?';

  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2B362E] font-semibold text-white ${className}`} aria-hidden="true">
      {src && src !== failedSrc
        ? <img className="h-full w-full object-cover" src={src} alt="" onError={() => setFailedSrc(src)} />
        : initials}
    </span>
  );
}
