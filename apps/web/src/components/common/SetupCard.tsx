import { useState } from 'react';
import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { AccordionSection } from '@/components/ui/Accordion';
/** Presentation only. Completion and dismissal must come from the owning server resource. */
export interface SetupStep {
  id: string;
  title: string;
  path: string;
  done: boolean;
  allowed?: boolean;
}
export function SetupCard({
  title,
  steps,
  onDismiss,
  busy = false,
}: {
  title: string;
  steps: SetupStep[];
  onDismiss?: () => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const complete = steps.filter((s) => s.done).length,
    next = steps.find((s) => !s.done);
  return (
    <section className="collection-surface space-y-3" aria-label={title}>
      <div className="flex items-center gap-3">
        <ListChecks className="text-primary" aria-hidden="true" />
        <h3>{title}</h3>
      </div>
      <p>{next ? `${complete} of ${steps.length} steps complete` : 'Setup complete'}</p>
      <Progress
        value={steps.length ? (complete / steps.length) * 100 : 100}
        label={`${title}: ${complete} of ${steps.length} steps complete`}
      />
      {next &&
        (next.allowed === false ? (
          <p>Ask an authorized administrator to continue setup.</p>
        ) : (
          <Button asChild>
            <a href={'#' + next.path}>Continue setup</a>
          </Button>
        ))}
      {!next && onDismiss && (
        <Button variant="ghost" disabled={busy} onClick={onDismiss}>
          Dismiss completed setup
        </Button>
      )}
      <AccordionSection title="View all steps" open={open} onOpenChange={setOpen}>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              {s.done ? (
                <CheckCircle2 aria-label="Complete" className="text-success" />
              ) : (
                <Circle aria-label="To do" />
              )}
              {s.allowed === false ? (
                <span>{s.title} — ask an administrator</span>
              ) : (
                <a className="hover:underline" href={'#' + s.path}>
                  {s.title}
                </a>
              )}
            </li>
          ))}
        </ul>
      </AccordionSection>
    </section>
  );
}
