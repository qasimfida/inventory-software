import { useState } from 'react';
import { Panel } from '@/components/common/Layout';
import { Switch } from '@/components/ui/Switch';
import { Segmented } from '@/components/ui/Segmented';
export function PreferenceControlsDemo() {
  const [effects, setEffects] = useState(false),
    [density, setDensity] = useState('comfortable');
  return (
    <Panel aria-labelledby="preference-controls">
      <h2 id="preference-controls">Preference controls</h2>
      <Switch
        label="Example effects"
        description="Local example only; no account settings are saved."
        checked={effects}
        onCheckedChange={setEffects}
      />
      <Switch label="Disabled switch" checked disabled onCheckedChange={() => {}} />
      <Segmented
        label="Example density"
        value={density}
        options={['compact', 'comfortable']}
        onChange={setDensity}
      />
      <p role="status">
        Effects {effects ? 'enabled' : 'disabled'} · {density}
      </p>
    </Panel>
  );
}
