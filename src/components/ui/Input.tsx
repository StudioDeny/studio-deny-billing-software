import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-mono uppercase tracking-editorial text-[#4A4844] font-medium"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#4A4844]">
              {prefix}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              clsx(
                'w-full bg-[#D5D5D8] text-[#111111] placeholder:text-[#4A4844] text-sm px-3.5 py-2.5 border border-[rgba(0,0,0,0.18)] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] transition-colors rounded-none',
                prefix && 'pl-9',
                suffix && 'pr-9',
                error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
                className
              )
            )}
            {...props}
          />

          {suffix && (
            <div className="absolute right-3 flex items-center pointer-events-none text-[#4A4844]">
              {suffix}
            </div>
          )}
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

Input.displayName = 'Input';
