import { useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
/** Local suggestions only; the owner debounces/cancels its authorized query. */
export function SearchControl({
  label,
  placeholder = label,
  value,
  onChange,
  suggestions: allSuggestions = [],
  onSelect,
  action,
  onSubmit,
  emptyMessage = 'No matching results. Try another search.',
  busy = false,
  disabled = false,
}: {
  label: string;
  /** Short visual hint; the accessible label remains descriptive. */
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: { value: string; label: string }[];
  onSelect?: (value: string) => void;
  action?: { label: string; onSelect: () => void } | undefined;
  onSubmit?: () => void;
  emptyMessage?: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  const suggestions = [
    ...allSuggestions.slice(0, action ? 7 : 8),
    ...(action ? [{ value: '__create_action__', label: action.label }] : []),
  ];
  const choose = (value: string) =>
    value === '__create_action__' && action ? action.onSelect() : (onSelect ?? onChange)(value);
  const id = useId(),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const selected = Math.min(active, suggestions.length - 1);
  return (
    <div
      className="search-control"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className="search-field">
        <Search aria-hidden="true" className="search-leading-icon" />
        <Input
          ref={input}
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={id}
          aria-expanded={open}
          aria-activedescendant={open && selected >= 0 ? `${id}-${selected}` : undefined}
          value={value}
          disabled={disabled}
          maxLength={120}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                Math.max(0, Math.min(suggestions.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))),
              );
            }
            if (e.key === 'Enter' && selected < 0 && onSubmit) {
              e.preventDefault();
              onSubmit();
              setOpen(true);
            }
            if (e.key === 'Enter' && open && suggestions[selected]) {
              e.preventDefault();
              choose(suggestions[selected].value);
              setOpen(false);
            }
          }}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            className="search-clear"
            disabled={disabled}
            onClick={() => {
              onChange('');
              setOpen(false);
              input.current?.focus();
            }}
          >
            <X />
          </Button>
        )}
      </div>
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="search-suggestions"
        >
          {busy ? (
            <p role="status">Searching…</p>
          ) : suggestions.length ? (
            suggestions.slice(0, 8).map((item, i) => (
              <button
                id={`${id}-${i}`}
                type="button"
                role="option"
                aria-selected={selected === i}
                key={item.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  choose(item.value);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ))
          ) : (
            <p role="status">{value ? emptyMessage : 'Type a product name or SKU.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
