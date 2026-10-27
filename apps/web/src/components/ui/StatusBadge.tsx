import type { ReactNode } from 'react';
const tones = {
  neutral: 'text-muted-foreground bg-muted',
  success: 'text-success bg-success/10 border-success/30',
  warning: 'text-warning bg-warning/10 border-warning/30',
  error: 'text-destructive bg-destructive/10 border-destructive/30',
  info: 'text-info bg-info/10 border-info/30',
};
export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      data-tone={tone}
      className={`inline-flex max-w-full items-center break-words rounded-(--control-radius) border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
