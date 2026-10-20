import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
export const Box = ({ children }: { children: ReactNode }) => (
  <section className="space-y-3 border-t py-4">{children}</section>
);
export const Txt = ({ children }: { children: ReactNode }) => <p role="status">{children}</p>;
export const Act = ({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Button disabled={disabled} onClick={onPress}>
    {label}
  </Button>
);
export const F = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) => (
  <label className="block">
    {label}
    <Input value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);
export const Secret = ({ value, onChange }: { value: string; onChange: (s: string) => void }) => (
  <label className="block" htmlFor="offline-passphrase">
    Separate offline passphrase (15–128 characters)
    <Input
      id="offline-passphrase"
      type="password"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);
export const Pick = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
}) => (
  <label className="block">
    {label}
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  </label>
);
