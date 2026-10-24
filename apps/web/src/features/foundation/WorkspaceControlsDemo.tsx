import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { RecordDetails } from '@/components/common/RecordDetails';
import { useState } from 'react';
import { Box, Txt, Act, F, Pick, Secret } from '@/components/common/WorkspaceControls';
import { Panel } from '@/components/common/Layout';
export function WorkspaceControlsDemo() {
  const [reference, setReference] = useState('COUNT-EXAMPLE');
  const [location, setLocation] = useState('main');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  return (
    <Panel id="showcase-common" tabIndex={-1} aria-label="Warehouse and offline control examples">
      <ScreenHeader
        title="Warehouse and offline helpers"
        description="Shared screen structure and exact, labelled transaction values."
      />
      <RecordDetails
        label="Example transaction details"
        items={[
          { label: 'Reference', value: reference },
          { label: 'Exact quantity', value: '1234.567890' },
          { label: 'Amount (USD minor units)', value: '9007199254740993' },
          { label: 'Confirmation', value: 'Local example only' },
        ]}
      />
      <WarehouseSelect
        label="Page warehouse"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
      >
        <option value="main">Main warehouse</option>
        <option value="annex">Annex</option>
      </WarehouseSelect>
      <Box>
        <Txt>Local controls only. Do not enter a real passphrase in this example.</Txt>
        <F label="Example warehouse reference" value={reference} onChange={setReference} />
        <Pick
          label="Example warehouse"
          value={location}
          onChange={setLocation}
          options={[
            { value: 'main', label: 'Main warehouse' },
            { value: 'annex', label: 'Annex' },
          ]}
        />
        <Secret value={secret} onChange={setSecret} />
        <Act
          label="Clear local example passphrase"
          onPress={() => {
            setSecret('');
            setMessage('Local example cleared.');
          }}
        />
      </Box>
      <p role="status">{message}</p>
    </Panel>
  );
}
