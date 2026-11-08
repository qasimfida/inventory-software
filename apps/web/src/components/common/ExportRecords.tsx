import { useState } from 'react';
import { recordsCsv } from '@inventory/api-client';
import { saveLocalText } from '@/platform/files';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
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
      <Button variant="outline" disabled={busy || !rows.length} onClick={() => void save()}>
        <Download aria-hidden="true" />
        {busy ? 'Exporting…' : label}
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
