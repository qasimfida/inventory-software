import { Button } from '@/components/ui/Button';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <p role="status" className="text-muted-foreground">
      {message}
    </p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground">{message}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-4">
      <p role="alert" className="text-destructive">
        {message}
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
