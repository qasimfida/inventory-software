import { useId } from 'react';
import type { ReactNode, ComponentProps } from 'react';

interface FormFieldProps {
  id?: string;
  label: string;
  description?: string;
  error?: string | undefined;
  required?: boolean;
  children: (
    control: Pick<ComponentProps<'input'>, 'id' | 'aria-invalid' | 'aria-describedby' | 'required'>,
  ) => ReactNode;
}

export function FormField({ id, label, description, error, required, children }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionIds = [description ? `${fieldId}-hint` : '', error ? `${fieldId}-error` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
        {required && <span className="text-muted-foreground"> (required)</span>}
      </label>
      {description && (
        <p id={`${fieldId}-hint`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children({
        id: fieldId,
        'aria-invalid': Boolean(error),
        'aria-describedby': descriptionIds || undefined,
        required,
      })}
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ErrorSummary({
  errors,
  ...props
}: { errors: { id: string; message: string }[] } & ComponentProps<'div'>) {
  if (!errors.length) return null;
  return (
    <div
      role="alert"
      tabIndex={-1}
      className="space-y-2 rounded-md border border-destructive p-4"
      {...props}
    >
      <p className="font-semibold">Please correct the following:</p>
      <ul className="list-inside list-disc">
        {errors.map(({ id, message }) => (
          <li key={id}>
            <button
              type="button"
              className="text-left text-destructive underline underline-offset-4"
              onClick={() => document.getElementById(id)?.focus()}
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
