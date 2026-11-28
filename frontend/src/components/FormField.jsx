import { useId } from 'react';

export default function FormField({ as: Control = 'input', label, error, className = '', inputClassName = '', ...inputProps }) {
  const id = useId();
  const inputId = inputProps.id || id;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-[#2B362E]">{label}</label>
      <Control
        {...inputProps}
        id={inputId}
        className={`control-input ${error ? 'border-[#B91C1C] focus:border-[#B91C1C]' : ''} ${inputClassName}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        dir={inputProps.dir || 'auto'}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}
