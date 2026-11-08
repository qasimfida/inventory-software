import { currencySchema, exchangeSnapshotSchema } from '@inventory/contracts';
/** Node 24 exposes primitive JSON source text: never round rate literals through Number. */
export function parseProvider(body: string, now: number) {
  const parsed: unknown = JSON.parse(
    body,
    (key: string, value: unknown, context?: { source?: string }) =>
      currencySchema.safeParse(key).success && typeof value === 'number' ? context?.source : value,
  );
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid provider response');
  const raw = parsed as Record<string, unknown>;
  if (
    raw.base !== 'USD' ||
    typeof raw.timestamp !== 'number' ||
    !Number.isSafeInteger(raw.timestamp)
  )
    throw new Error('Invalid provider metadata');
  const asOf = raw.timestamp * 1000;
  if (asOf > now + 300000 || asOf <= 0) throw new Error('Invalid provider time');
  if (!raw.rates || typeof raw.rates !== 'object') throw new Error('Missing provider rates');
  const rates = Object.fromEntries(
    Object.entries(raw.rates).filter(([key]) => currencySchema.safeParse(key).success),
  );
  return exchangeSnapshotSchema.parse({
    source: 'Open Exchange Rates',
    base: 'USD',
    asOf: new Date(asOf).toISOString(),
    fetchedAt: new Date(now).toISOString(),
    expiresAt: new Date(asOf + 86400000).toISOString(),
    rates,
  });
}
export async function fetchRates(appId: string) {
  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(appId)}`,
    {
      signal: AbortSignal.timeout(3000),
      redirect: 'error',
      headers: { Accept: 'application/json' },
    },
  );
  if (!response.ok || !response.body) throw new Error('Rate source unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 100000) throw new Error('Rate source response too large');
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  return parseProvider(Buffer.concat(chunks).toString('utf8'), Date.now());
}
