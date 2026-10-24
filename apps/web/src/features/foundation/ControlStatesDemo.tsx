import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Checkbox } from '@/components/ui/FormControls';
import { FormField } from '@/components/common/FormField';
import { Cluster } from '@/components/common/Layout';

// Local interaction examples only; never issue a business command from the showcase.
export function ControlStatesDemo() {
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(false);
  return (
    <section aria-label="Control interaction states" className="space-y-4">
      <h3>Control interaction states</h3>
      <p>
        Short choices open directly. Larger collections include search; static collections can set
        searchable=false.
      </p>
      <Select aria-label="Preview yes or no">
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
      <Select aria-label="Preview searchable locations">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <option key={index} value={String(index)}>
            Example location {index + 1}
          </option>
        ))}
      </Select>
      <Cluster>
        <Button size="sm">Small example</Button>
        <Button size="lg">Large example</Button>
        <Button variant="ghost">Ghost example</Button>
        <Button variant="link">Link example</Button>
        <Button disabled>Disabled example</Button>
        <Button variant="outline" aria-pressed={selected} onClick={() => setSelected(!selected)}>
          Toggle example
        </Button>
        <Button loading={pending} onClick={() => setPending(true)}>
          Stable loading example
        </Button>
        <Button variant="outline" onClick={() => setPending(false)}>
          Finish local loading
        </Button>
      </Cluster>
      <FormField label="Read-only reference" description="Selectable text; included in form data.">
        {(control) => <Input {...control} readOnly value="REF-EXAMPLE" />}
      </FormField>
      <FormField label="Disabled field" description="Unavailable controls do not submit values.">
        {(control) => <Input {...control} disabled defaultValue="Unavailable" />}
      </FormField>
      <FormField label="Invalid example" error="Example error linked to its field.">
        {(control) => <Input {...control} defaultValue="Example value" />}
      </FormField>
      <FormField label="Select with unavailable option">
        {(control) => (
          <Select {...control} defaultValue="available">
            <option value="available">Available option</option>
            <option value="unavailable" disabled>
              Unavailable option
            </option>
          </Select>
        )}
      </FormField>
      <label
        htmlFor="example-disabled-checkbox"
        className="flex min-h-(--target-size) items-center gap-2"
      >
        <Checkbox id="example-disabled-checkbox" disabled defaultChecked /> Disabled selected
        checkbox
      </label>
    </section>
  );
}
