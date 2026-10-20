import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Page({ className, children, ...props }: ComponentProps<'main'>) {
  return (
    <>
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only fixed top-4 left-4 z-50 rounded-md bg-card px-4 py-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <main
        id="main"
        tabIndex={-1}
        className={cn('mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12', className)}
        {...props}
      >
        {children}
      </main>
    </>
  );
}

export function Stack({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex min-w-0 flex-col gap-4', className)} {...props} />;
}

export function Cluster({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)} {...props} />;
}

export function Grid({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2', className)} {...props} />
  );
}

export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('min-w-0 space-y-5 rounded-xl border bg-card p-5 sm:p-6', className)}
      {...props}
    />
  );
}
