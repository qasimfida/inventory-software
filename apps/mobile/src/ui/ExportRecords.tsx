import { useState } from 'react';
import { recordsCsv } from '@inventory/api-client';
import { saveLocalText } from '../platform/files';
import { Action } from './Controls';
import { Text } from './Themed';
/** Export authorized rows already loaded; never silently fetch all records or change scope. */
export function ExportRecords({
  headers,
  rows,
  name = 'records-shown',
  label = 'Export shown records',
}: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  name?: string;
  label?: string;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save() {
    setError('');
    setBusy(true);
    try {
      await saveLocalText(`${name}.csv`, recordsCsv(headers, rows), 'text/csv');
    } catch {
      setError('Unable to export. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Action
        variant="outline"
        label={busy ? 'Exporting…' : label}
        disabled={busy || !rows.length}
        onPress={() => void save()}
      />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </>
  );
}
