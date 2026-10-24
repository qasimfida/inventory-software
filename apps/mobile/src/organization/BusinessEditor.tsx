import { FormSection } from '../ui/FormSection';
import { ConfirmAction } from '../ui/ConfirmAction';
import { Text } from '../ui/Themed';
import { useState } from 'react';
import { View } from 'react-native';
import { editBusinessSchema } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import type { OrganizationModel } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from './Controls';
export function BusinessEditor({
  business,
  model,
  busy,
}: {
  business: Business;
  model: OrganizationModel;
  busy: boolean;
}) {
  const [timeZone, setTimeZone] = useState(business.timeZone ?? 'UTC');
  const [name, setName] = useState(business.name);
  const [state, setState] = useState<string>(business.state);
  const disabled = busy || business.state === 'archived';
  function save() {
    void model.refresh(async () => {
      await model.client.editBusiness(
        business.id,
        editBusinessSchema.parse({ name, state, timeZone, version: business.version }),
      );
    });
  }
  return (
    <View style={styles.group}>
      <Field label="Business name" value={name} onChange={setName} disabled={disabled} />
      <Field
        label="Business time zone (IANA)"
        value={timeZone}
        onChange={setTimeZone}
        disabled={disabled}
      />
      <FormSection title="Business status and archiving">
        <Choice
          label="Business state"
          value={state}
          options={choices(['active', 'suspended', 'archived'])}
          onChange={setState}
          disabled={disabled}
        />
        <Text>Suspension blocks child access. Archiving is permanent.</Text>
      </FormSection>
      {state === 'archived' ? (
        <ConfirmAction
          label="Save business"
          description="Archiving is permanent and locks business operations."
          disabled={disabled}
          onConfirm={save}
          confirmLabel="Confirm archive"
        />
      ) : (
        <Action label="Save business" disabled={disabled} onPress={save} />
      )}
    </View>
  );
}
