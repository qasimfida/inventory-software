import { useId } from 'react';
export function Segmented({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="segmented-field" disabled={disabled}>
      <legend>{label}</legend>
      <div className="segmented-options">
        {options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
