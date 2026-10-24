import { useId, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
export function CommandSelect({
  items,
  selected,
  onSelect,
  triggerRef,
  ...props
}: {
  items: { value: string; label: ReactNode; disabled: boolean }[];
  selected: string;
  onSelect: (value: string) => void;
  triggerRef: Ref<HTMLButtonElement>;
  id?: string | undefined;
  disabled?: boolean | undefined;
  className?: string;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling' | undefined;
  'aria-required'?: boolean | undefined;
  title?: string | undefined;
}) {
  const [open, setOpen] = useState(false),
    listId = useId();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          ref={triggerRef}
          role="combobox"
          aria-controls={listId}
          aria-expanded={open}
          {...props}
        >
          <span>{items.find((i) => i.value === selected)?.label ?? 'Select…'}</span>
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="command-select-panel p-0" align="start">
        <Command label={props['aria-label'] ?? 'Choose option'}>
          <div className="command-search">
            <Search aria-hidden="true" />
            <Command.Input
              placeholder="Search options…"
              aria-label="Search options"
              aria-labelledby={undefined}
            />
          </div>
          <Command.List id={listId}>
            <Command.Empty>No matching options.</Command.Empty>
            {items.map((i) => (
              <Command.Item
                key={i.value}
                value={`option:${i.value}`}
                keywords={[typeof i.label === 'string' ? i.label : String(i.value)]}
                disabled={i.disabled}
                onSelect={() => {
                  onSelect(i.value);
                  setOpen(false);
                }}
              >
                <span>{i.label}</span>
                {i.value === selected && <Check aria-hidden="true" />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
