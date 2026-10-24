import { CommandSelect } from './CommandSelect';
import * as Primitive from '@radix-ui/react-select';
import { Children, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { value: string; label: ReactNode; disabled: boolean };
function options(children: ReactNode, parentDisabled = false): Option[] {
  return Children.toArray(children).flatMap((child): Option[] => {
    if (!isValidElement<ComponentProps<'option'>>(child)) return [];
    if (child.type !== 'option')
      return options(child.props.children, parentDisabled || !!child.props.disabled);
    return [
      {
        value: String(child.props.value ?? child.props.children ?? ''),
        label: child.props.children,
        disabled: parentDisabled || !!child.props.disabled,
      },
    ];
  });
}
/** shadcn-style Radix selection with native form validation and original change events. */
export function Select({
  children,
  searchable,
  className,
  value,
  defaultValue,
  onChange,
  id,
  ...props
}: ComponentProps<'select'> & { searchable?: boolean }) {
  const items = options(children),
    native = useRef<HTMLSelectElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [local, setLocal] = useState(String(defaultValue ?? items[0]?.value ?? ''));
  const [error, setError] = useState('');
  const errorId = useId(),
    initial = String(defaultValue ?? items[0]?.value ?? '');
  useEffect(() => {
    const form = native.current?.form;
    if (!form) return;
    const reset = (event: Event) =>
      queueMicrotask(() => {
        if (event.defaultPrevented || value !== undefined) return;
        setLocal(initial);
        setError('');
        if (native.current) native.current.value = initial;
      });
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [initial, value]);
  const candidate = value === undefined ? local : String(value);
  const selected = items.some((item) => item.value === candidate)
    ? candidate
    : (items[0]?.value ?? '');
  const encode = (v: string) => `option:${v}`;
  return (
    <>
      <select
        {...props}
        ref={native}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        aria-label={undefined}
        value={selected}
        onChange={(e) => {
          setLocal(e.target.value);
          setError('');
          onChange?.(e);
        }}
        onInvalid={(e) => {
          props.onInvalid?.(e);
          e.preventDefault();
          setError(e.currentTarget.validationMessage);
          trigger.current?.focus();
        }}
      >
        {children}
      </select>
      {(searchable ?? items.length > 7) ? (
        <CommandSelect
          items={items}
          selected={selected}
          triggerRef={trigger}
          id={id}
          disabled={props.disabled}
          className={cn('select-trigger', className)}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={
            [props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
          aria-invalid={props['aria-invalid'] ?? !!error}
          aria-required={props.required}
          title={props.title}
          onSelect={(next) => {
            if (native.current) {
              native.current.value = next;
              native.current.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
        />
      ) : (
        <Primitive.Root
          value={encode(selected)}
          disabled={props.disabled}
          onValueChange={(next) => {
            if (native.current) {
              native.current.value = next.slice(7);
              native.current.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
        >
          <Primitive.Trigger
            ref={trigger}
            id={id}
            className={cn('select-trigger', className)}
            aria-label={props['aria-label']}
            aria-labelledby={props['aria-labelledby']}
            aria-describedby={
              [props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') ||
              undefined
            }
            aria-invalid={props['aria-invalid'] ?? !!error}
            aria-required={props.required}
            title={props.title}
          >
            <Primitive.Value>
              {items.find((i) => i.value === selected)?.label ?? 'Select…'}
            </Primitive.Value>
            <Primitive.Icon>
              <ChevronDown aria-hidden="true" />
            </Primitive.Icon>
          </Primitive.Trigger>
          <Primitive.Portal>
            <Primitive.Content position="popper" sideOffset={6} className="select-menu">
              <Primitive.Viewport>
                {items.map((item) => (
                  <Primitive.Item
                    key={item.value}
                    value={encode(item.value)}
                    disabled={item.disabled}
                    className="select-option"
                  >
                    <Primitive.ItemText>{item.label}</Primitive.ItemText>
                    <Primitive.ItemIndicator>
                      <Check aria-hidden="true" />
                    </Primitive.ItemIndicator>
                  </Primitive.Item>
                ))}
              </Primitive.Viewport>
            </Primitive.Content>
          </Primitive.Portal>
        </Primitive.Root>
      )}
      {error && (
        <span id={errorId} className="text-destructive text-sm" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
