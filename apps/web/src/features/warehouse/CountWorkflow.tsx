import { useMemo, useState } from 'react';
import { createCountClient, countExport } from '@inventory/api-client';
import type { Business, CountDetail } from '@inventory/contracts';
import { Txt, Act, F } from '@/components/common/WorkspaceControls';
import { Button } from '@/components/ui/Button';
import { authClient } from '@/platform/auth-client';
const key = () => crypto.randomUUID();
const Export = ({ text }: { text: string }) => (
  <Button
    onClick={() => {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stock-count.json';
      a.click();
      URL.revokeObjectURL(url);
    }}
  >
    Export count JSON
  </Button>
);

export function CountWorkflow({
  business,
  warehouseId,
  sourceId,
  product,
  unitId,
  run,
}: {
  business: Business;
  warehouseId: string;
  sourceId: string;
  product: { id: string } | null;
  unitId: string;
  run: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const counts = useMemo(
    () => createCountClient(authClient.organizationRequest, key, business.id),
    [business.id],
  );
  const [count, setCount] = useState<CountDetail | null>(null),
    [countIds, setCountIds] = useState<string[]>([]),
    [quantity, setQuantity] = useState('0'),
    [reason, setReason] = useState(''),
    [sessions, setSessions] = useState<{ id: string; state: string }[]>([]);
  return (
    <>
      <Act
        label="Add selected product to new count scope"
        onPress={() => {
          if (product) setCountIds([...new Set([...countIds, product.id])]);
        }}
      />
      <Txt>
        New count scope: {countIds.join(', ') || 'none'}. Only explicitly selected variants are
        counted; omitted products are unchanged.
      </Txt>
      <Act
        label="Create blind count"
        onPress={() =>
          void run(async () =>
            setCount(
              await counts.create({
                warehouseId,
                locationId: sourceId || null,
                blind: true,
                variantIds: countIds,
              }),
            ),
          )
        }
      />
      <Act
        label="List saved count sessions"
        onPress={() => void run(async () => setSessions((await counts.list(warehouseId)).counts))}
      />
      {sessions.map((s) => (
        <Act
          key={s.id}
          label={`Resume ${s.id} · ${s.state}`}
          onPress={() => void run(async () => setCount(await counts.detail(s.id)))}
        />
      ))}
      {count && (
        <>
          <Txt>
            Count {count.count.id} · {count.count.state} · version {count.count.version}. Expected
            stock is hidden during blind capture. Stock movement since snapshot requires a full
            recount. Owner approval is required before adjustments.
          </Txt>
          {count.lines.map((l) => (
            <Txt key={l.id}>
              {l.name} / {l.sku}: counted {l.counted ?? 'not counted'}; expected{' '}
              {l.expected ?? 'hidden'}; attempt {l.attempt};{' '}
              {l.stale ? 'MOVEMENT: RECOUNT REQUIRED' : ''}
            </Txt>
          ))}
          <F label="Absolute counted quantity" value={quantity} onChange={setQuantity} />
          <Act
            label="Save / replace selected count line"
            onPress={() =>
              void run(async () => {
                if (!product) throw new Error('Scan a count product');
                setCount(
                  await counts.capture(count.count.id, {
                    variantId: product.id,
                    unitId,
                    quantity,
                    version: count.count.version,
                  }),
                );
              })
            }
          />
          <F
            label="Count review reason (minimum 10 characters)"
            value={reason}
            onChange={setReason}
          />
          {(['submit', 'recount', 'approve'] as const).map((action) => (
            <Act
              key={action}
              label={
                action === 'approve'
                  ? 'Owner: approve reviewed adjustments'
                  : action === 'submit'
                    ? 'Submit complete count for review'
                    : 'Start full recount with new stock snapshot'
              }
              onPress={() =>
                void run(async () =>
                  setCount(
                    await counts.transition(count.count.id, action, {
                      version: count.count.version,
                      reason,
                    }),
                  ),
                )
              }
            />
          ))}
          <Export text={countExport(count)} />
        </>
      )}
    </>
  );
}
