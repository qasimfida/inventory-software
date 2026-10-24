import { useId } from 'react';
export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}
/** Controlled boolean control; the caller owns persistence and feedback. */
export function Switch({ label, description, checked, disabled, onCheckedChange }: SwitchProps) {
  const id = useId();
  return (
    <div className="switch-field">
      <div>
        <label htmlFor={id}>{label}</label>
        {description && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-hint` : undefined}
        disabled={disabled}
        className="ui-switch"
        onClick={() => onCheckedChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
