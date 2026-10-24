import { Inbox, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { useAppearance } from '@/theme/Appearance';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  const { preferences } = useAppearance();
  if (preferences.states === 'enhanced') return <Skeleton label={message} />;
  return (
    <div className="space-y-2">
      <p role="status" className="text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Progress label={message} />
    </div>
  );
}

export function EmptyState({
  message,
  announce = false,
  action,
  description = 'There are no records to display here yet.',
}: {
  description?: string | undefined;
  message: string;
  announce?: boolean;
  action?: { label: string; onClick: () => void } | undefined;
}) {
  const { preferences } = useAppearance();
  const enhanced = preferences.states === 'enhanced';
  return (
    <div className={enhanced ? 'feedback-state' : undefined}>
      {enhanced && <Inbox aria-hidden="true" className="text-muted-foreground" />}
      <p
        role={announce ? 'status' : undefined}
        className={enhanced ? 'font-semibold' : 'text-sm text-muted-foreground'}
      >
        {message}
      </p>
      {enhanced && <p className="text-sm text-muted-foreground">{description}</p>}
      {enhanced && action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { preferences } = useAppearance();
  return (
    <div
      className={
        preferences.states === 'enhanced'
          ? 'space-y-3 rounded-md border border-destructive bg-card p-4'
          : 'space-y-3'
      }
    >
      {preferences.states === 'enhanced' && (
        <>
          <AlertCircle aria-hidden="true" className="text-destructive" />
          <h3>Unable to load this view</h3>
        </>
      )}
      <p role="alert" className="text-sm leading-relaxed text-destructive">
        {message}
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
