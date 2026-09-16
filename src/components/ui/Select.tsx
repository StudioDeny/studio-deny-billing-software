import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: Option[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, children, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[11px] font-mono uppercase tracking-editorial text-[#4A4844] font-medium"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={twMerge(
              clsx(
                'w-full appearance-none bg-[#D5D5D8] text-[#111111] text-sm px-3.5 py-2.5 pr-10 border border-[rgba(0,0,0,0.18)] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] transition-colors rounded-none cursor-pointer',
                error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
                className
              )
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 pointer-events-none text-[#4A4844]">
            <ChevronDown size={14} />
          </div>
        </div>

        {error ? (
          <span className="text-[11px] text-rose-600 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-[11px] text-[#4A4844]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
