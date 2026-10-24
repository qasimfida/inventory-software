import { useState } from 'react';
import { preferencePatchSchema } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
type FontWindow = Window & { queryLocalFonts?: () => Promise<{ family: string }[]> };
/** Font names only; no font bytes or installed-font inventory leave this browser. */
export function FontPicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [fonts, setFonts] = useState<string[]>([]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const supported = typeof (window as FontWindow).queryLocalFonts === 'function';
  async function discover() {
    setBusy(true);
    setMessage('');
    try {
      const discovered = await (window as FontWindow).queryLocalFonts!();
      const names = [...new Set(discovered.map((f) => `local:${f.family}`))]
        .filter((font) => preferencePatchSchema.safeParse({ font }).success)
        .sort();
      setFonts(names);
      setMessage(
        names.length
          ? `${names.length} installed font families available on this device.`
          : 'No installed font families were returned.',
      );
    } catch {
      setMessage('Font access was not granted or is unavailable. Bundled fonts remain available.');
    } finally {
      setBusy(false);
    }
  }
  const options = [...new Set(['Karla', 'system', 'Lora', 'serif', 'monospace', value, ...fonts])];
  return (
    <div className="space-y-3">
      <label>
        Font
        <Select
          aria-label="Font"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((f) => (
            <option key={f} value={f}>
              {f === 'Karla'
                ? 'App default · Karla'
                : f === 'system'
                  ? 'Device system font'
                  : f.replace(/^local:/, '')}
              {f.startsWith('local:') ? ' · this device' : ''}
            </option>
          ))}
        </Select>
      </label>
      {supported ? (
        <Button variant="outline" disabled={disabled || busy} onClick={() => void discover()}>
          Find installed fonts
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Installed-font discovery is unavailable in this browser. Karla and Lora are included with
          the application.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        A device font falls back to the system font on devices where it is unavailable.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
