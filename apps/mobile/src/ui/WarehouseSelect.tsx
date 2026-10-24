import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Choice, Action } from './Controls';
import { SidePanel } from './SidePanel';
/** Native equivalent of the shared page warehouse context control. */
export function WarehouseSelect(props: ComponentProps<typeof Choice>) {
  const [open, setOpen] = useState(false);
  const name =
    props.options.find((option) => option.value === props.value)?.label ?? 'Select warehouse';
  return (
    <>
      <Action
        variant="ghost"
        label={`${props.label} · ${name}`}
        disabled={props.disabled ?? false}
        onPress={() => setOpen(true)}
      />
      <SidePanel title={props.label} open={open} onClose={() => setOpen(false)}>
        <Choice
          {...props}
          onChange={(value) => {
            props.onChange(value);
            setOpen(false);
          }}
        />
      </SidePanel>
    </>
  );
}
