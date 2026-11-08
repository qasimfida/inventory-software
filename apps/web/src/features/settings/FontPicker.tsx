import { Select } from '@/components/ui/FormControls';
/** Bundled choices; retain an explicit legacy choice without enumerating device fonts. */
export function FontPicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const options = [...new Set(['Geist', 'GeistMono', 'Karla', 'Lora', value])];
  return (
    <label>
      Font
      <Select
        aria-label="Font"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((font) => (
          <option key={font} value={font}>
            {font === 'Geist' ? 'App default · Geist' : font.replace(/^local:/, '')}
          </option>
        ))}
      </Select>
      <span className="text-sm text-muted-foreground">
        Bundled fonts work offline. Existing device fonts retain their fallback.
      </span>
    </label>
  );
}
