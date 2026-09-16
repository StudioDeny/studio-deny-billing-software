import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium uppercase tracking-editorial transition-all duration-150 select-none focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-40 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-xs px-4 py-2.5 gap-2 h-10',
    lg: 'text-sm px-6 py-3.5 gap-2.5 h-12 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-[#111111] text-[#E2E2E4] border border-[#111111] hover:bg-neutral-800 active:bg-[#111111] shadow-subtle',
    secondary:
      'bg-[#D5D5D8] text-[#111111] border border-[rgba(0,0,0,0.18)] hover:bg-[#D5D5D8] active:bg-[rgba(0,0,0,0.18)]',
    outline:
      'bg-transparent text-[#111111] border border-[rgba(0,0,0,0.18)] hover:border-[#111111] hover:bg-[#D5D5D8] active:bg-[#D5D5D8]',
    ghost:
      'bg-transparent text-[#111111] border border-transparent hover:bg-[#D5D5D8] active:bg-[#D5D5D8]',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:bg-rose-200',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          className
        )
      )}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
};
