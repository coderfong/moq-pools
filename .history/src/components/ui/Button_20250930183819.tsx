"use client";
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

type Common = { variant?: Variant; size?: Size; loading?: boolean; className?: string; as?: 'button' | 'a' };
type Props =
  | (Common & React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' })
  | (Common & React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' });

function Button(allProps: Props) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    as = 'button',
    ...props
  } = allProps as any;

  const base = 'inline-flex items-center justify-center rounded-full font-medium transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const sizes: Record<Size, string> = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };
  const variants: Record<Variant, string> = {
    primary: 'btn-mag btn-primary-gradient shadow-card hover:shadow-lg',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-900 border border-gray-200 hover:bg-gray-50',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  };
  const s = size as Size;
  const v = variant as Variant;
  const cls = [base, sizes[s], variants[v], className, loading ? 'opacity-70 pointer-events-none' : ''].join(' ').trim();
  const inner = (
    <>
      {loading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
      ) : null}
      {children}
    </>
  );
  if (as === 'a') {
    return (
      <a className={cls} {...(props as any)}>
        {inner}
      </a>
    );
  }
  return (
    <button className={cls} {...(props as any)}>
      {inner}
    </button>
  );
}
export default Button;
