import { useSyncExternalStore, type ReactElement } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Monitor, Moon, Sun, SunMoon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { settingsModel } from '@/platform/settings';
import { useAppearance } from './Appearance';
export function ThemeMenu({
  side,
  menuItem = false,
}: {
  side: 'left' | 'right';
  menuItem?: boolean;
}) {
  if (menuItem)
    return (
      <Menu.Sub>
        <Menu.SubTrigger className="theme-menu-trigger">
          <SunMoon aria-hidden="true" />
          Theme
          <ChevronRight aria-hidden="true" />
        </Menu.SubTrigger>
        <Menu.Portal>
          <Menu.SubContent
            className="popover-panel theme-options"
            sideOffset={8}
            collisionPadding={12}
          >
            <ThemeOptions submenu />
          </Menu.SubContent>
        </Menu.Portal>
      </Menu.Sub>
    );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Theme and colors" aria-label="Theme and colors">
          <SunMoon />
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="theme-options">
        <ThemeOptions />
      </PopoverContent>
    </Popover>
  );
}
function ThemeOptions({ submenu = false }: { submenu?: boolean }) {
  const item = (key: string, child: ReactElement) =>
    submenu ? (
      <Menu.Item key={key} asChild onSelect={(event) => event.preventDefault()}>
        {child}
      </Menu.Item>
    ) : (
      child
    );
  const { appearance, locked, setAppearance } = useAppearance();
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const accent = settingsModel.effective().accent;
  const colorLocked =
    state.busy ||
    !state.snapshot ||
    state.snapshot.platform.values.enforced.accent !== undefined ||
    state.business?.values.enforced.accent !== undefined;
  return (
    <>
      <p className="text-sm font-medium">Appearance</p>
      <div role="group" aria-label="Theme">
        {(
          [
            { value: 'light', Icon: Sun },
            { value: 'dark', Icon: Moon },
            { value: 'system', Icon: Monitor },
          ] as const
        ).map(({ value, Icon }) =>
          item(
            value,
            <Button
              key={value}
              variant="ghost"
              className="theme-option"
              aria-pressed={appearance === value}
              disabled={locked}
              onClick={() => setAppearance(value)}
            >
              <Icon aria-hidden="true" />
              <span>{value[0]!.toUpperCase() + value.slice(1)}</span>
              {appearance === value && <Check aria-hidden="true" />}
            </Button>,
          ),
        )}
      </div>
      <hr />
      <p className="text-sm font-medium">Accent color</p>
      <div className="compact-palette" role="group" aria-label="Accent color">
        {(['default', 'teal', 'violet', 'rose', 'amber'] as const).map((color) =>
          item(
            color,
            <button
              key={color}
              type="button"
              data-palette={color}
              aria-label={color === 'default' ? 'Blue' : color}
              title={color === 'default' ? 'Blue' : color}
              aria-pressed={accent === color}
              disabled={colorLocked}
              onClick={() => void settingsModel.save({ accent: color })}
            >
              {accent === color && <Check aria-hidden="true" />}
            </button>,
          ),
        )}
      </div>
      {state.message && <p role="alert">{state.message}</p>}
    </>
  );
}
