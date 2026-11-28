import { useId, useRef } from 'react';
import { CloudUpload, File, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import IconBadge from './IconBadge';

export default function FileDropzone({ accept, label, hint, file, onSelect, error, disabled }) {
  const { t } = useTranslation();
  const input = useRef(null);
  const trigger = useRef(null);
  const id = useId();

  return (
    <div className="min-w-0 space-y-2">
      <input ref={input} type="file" accept={accept} hidden disabled={disabled} onChange={(event) => {
        const selected = event.target.files[0];
        event.target.value = '';
        if (selected) onSelect(selected);
      }} />
      <button ref={trigger} type="button" disabled={disabled} onClick={() => input.current?.click()}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const selected = event.dataTransfer.files[0];
          if (!disabled && selected) onSelect(selected);
        }}
        className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed bg-white p-4 text-center transition-colors hover:border-[#A37E5E] hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-[#B91C1C]' : 'border-[#E5E2D9]'}`}>
        <IconBadge icon={CloudUpload} tone="bronze" />
        <span className="text-sm font-semibold text-[#2B362E]">{label}</span>
        <span id={`${id}-hint`} className="text-xs leading-relaxed text-[#1C221E]/75">{hint}</span>
      </button>
      {file && <div className="flex min-w-0 items-center gap-2 rounded-full border border-[#E5E2D9] bg-white ps-3 text-xs">
        <File className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-start" dir="auto" title={file.name} role="status">{file.name}</span>
        <button type="button" disabled={disabled} aria-label={t('uploads.remove', { name: file.name })}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#2B362E] transition-colors hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => { onSelect(null); trigger.current?.focus(); }}>
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}
