import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { LiveNotice } from './LiveNotice';
import { CountWorkflow } from './CountWorkflow';
import { useMemo, useState } from 'react';
import { CommandForm } from '@/components/common/CommandForm';
import { authClient } from '@/platform/auth-client';
const key = () => crypto.randomUUID();
import { Box, Txt, Act, F, Pick } from '@/components/common/WorkspaceControls';
const Camera = (props: { onCode: (s: string) => void }) => (
  <p data-camera-available={typeof props.onCode === 'function' ? 'keyboard' : 'none'}>
    USB/Bluetooth keyboard scanner: focus a scan field, scan, then resolve. Scans select;
    confirmation posts.
  </p>
);
import { createScanClient, warehouseForms } from '@inventory/api-client';
import type { CommandForm as Definition } from '@inventory/api-client';
import { ScanGate } from '@inventory/domain';
import type { Business, Location } from '@inventory/contracts';
export function WarehousePanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const [open, setOpen] = useState(false),
    [warehouseId, setWarehouse] = useState(
      locations.find((l) => l.kind === 'warehouses')?.id ?? '',
    ),
    [mode, setMode] = useState('count'),
    [code, setCode] = useState(''),
    [locationCode, setLocationCode] = useState(''),
    [product, setProduct] = useState<{
      id: string;
      name: string;
      units: { id: string; code: string }[];
    } | null>(null),
    [unitId, setUnit] = useState(''),
    [sourceId, setSource] = useState(''),
    [destinationId, setDestination] = useState(''),
    [documentId, setDocument] = useState(''),
    [error, setError] = useState(''),
    [forms, setForms] = useState<Definition[]>([]);
  const scanner = useMemo(
      () => createScanClient(authClient.organizationRequest, business.id),
      [business.id],
    ),
    gate = useMemo(() => new ScanGate(), []);
  async function run(work: () => Promise<unknown>) {
    try {
      setError('');
      await work();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Operation failed; inspect document history before retrying.',
      );
    }
  }
  async function resolve(raw: string) {
    await run(async () => {
      const accepted = gate.accept(raw);
      if (!accepted) return;
      const p = await scanner.resolve(warehouseId, 'product', accepted);
      if (p.kind === 'product') {
        setProduct(p);
        setUnit(p.units[0]?.id ?? '');
        setForms([]);
      }
    });
  }
  async function location(destination: boolean) {
    await run(async () => {
      const l = await scanner.resolve(warehouseId, 'location', locationCode);
      if (destination) setDestination(l.id);
      else setSource(l.id);
      setForms([]);
    });
  }
  async function loadConfirmation() {
    if (!product && mode !== 'dispatch') throw new Error('Scan a product');
    setForms(
      await warehouseForms(authClient.organizationRequest, key, business.id, {
        warehouseId,
        variantId: product?.id ?? '',
        unitId,
        sourceId,
        destinationId,
        documentId,
        mode,
      }),
    );
  }
  return (
    <Box>
      <Act
        label={open ? 'Close count / scanning workbench' : 'Stock counts / warehouse scanning'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Txt>
            Online controlled warehouse operations. Scanning never increments or posts
            automatically. Quantities are absolute totals in the selected unit. Unexpected goods
            stay quarantined until purchasing approves an amended order.
          </Txt>
          <LiveNotice businessId={business.id} warehouseId={warehouseId} />
          <Txt>{error}</Txt>
          <WarehouseSelect
            label="Scanning warehouse"
            value={warehouseId}
            onChange={(e) => {
              const v = e.target.value;
              setWarehouse(v);
              setProduct(null);
              setForms([]);
              setSource('');
              setDestination('');
            }}
          >
            {locations
              .filter((l) => l.kind === 'warehouses')
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </WarehouseSelect>
          <Pick
            label="Workflow"
            value={mode}
            options={[
              { value: 'count', label: 'Stock count' },
              { value: 'purchase', label: 'Purchase receipt' },
              { value: 'move', label: 'Location movement' },
              { value: 'dispatch', label: 'Transfer dispatch' },
              { value: 'receive', label: 'Transfer receipt' },
            ]}
            onChange={(v) => {
              setMode(v);
              setForms([]);
            }}
          />
          <F label="Product barcode, SKU or variant ID" value={code} onChange={setCode} />
          <Act label="Resolve product scan" onPress={() => void resolve(code)} />
          <Camera
            onCode={(raw) => {
              setCode(raw);
              void resolve(raw);
            }}
          />
          <Txt>{product ? `${product.name} · ${product.id}` : 'No product selected'}</Txt>
          <Pick
            label="Scanned product unit"
            value={unitId}
            options={product?.units.map((u) => ({ value: u.id, label: u.code })) ?? []}
            onChange={(v) => {
              setUnit(v);
              setForms([]);
            }}
          />
          <F label="Location barcode / code / ID" value={locationCode} onChange={setLocationCode} />
          <Camera onCode={setLocationCode} />
          <Act label="Resolve source / count location" onPress={() => void location(false)} />
          <Act label="Resolve destination location" onPress={() => void location(true)} />
          <Txt>
            Source/count location: {sourceId || 'warehouse root for count only'}; destination:{' '}
            {destinationId || 'scan required'}
          </Txt>
          {mode === 'count' ? (
            <CountWorkflow
              key={warehouseId}
              business={business}
              warehouseId={warehouseId}
              sourceId={sourceId}
              product={product}
              unitId={unitId}
              run={run}
            />
          ) : (
            <>
              <F
                label="Purchase / transfer ID (not needed for location move)"
                value={documentId}
                onChange={(v) => {
                  setDocument(v);
                  setForms([]);
                }}
              />
              <Act
                label="Load validated workflow confirmation"
                onPress={() => void run(loadConfirmation)}
              />
              {forms.map((f) => (
                <CommandForm
                  key={f.title}
                  definition={f}
                  run={(work) =>
                    void run(async () => {
                      await work();
                      setForms([]);
                      setError(
                        'Server confirmed. Inspect document history before another receipt.',
                      );
                    })
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </Box>
  );
}
