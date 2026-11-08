// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { transferDetailSchema } from '@inventory/contracts';
import { TransferDetails } from './TransferDetails';
afterEach(cleanup);
it('shows separate exact receipt quantities, endpoints and audit evidence without actions', () => {
  const seed = createDemoSeed(0, 'owner');
  const detail = transferDetailSchema.parse(seed.transfers[3]);
  detail.receipts = [
    {
      id: seed.id(800),
      lineId: detail.lines[0]!.id,
      received: '0.250001',
      damaged: '0.000001',
      shortage: '1.000001',
      reason: 'Confirmed damaged packaging',
      actorId: seed.id(901),
    },
  ];
  render(<TransferDetails detail={detail} timeZone="UTC" locations={seed.locations} />);
  for (const value of [
    '0.250001',
    '0.000001',
    '1.000001',
    'Confirmed damaged packaging',
    'partially received',
    'Transfer lines',
    'Receipt history',
    'Transfer history',
  ])
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button')).toBeNull();
});
it('explains absent receipts and events instead of showing blank sections', () => {
  const detail = transferDetailSchema.parse(createDemoSeed(0, 'owner').transfers[0]);
  render(
    <TransferDetails detail={{ ...detail, lines: [], receipts: [], events: [] }} timeZone="UTC" />,
  );
  for (const label of ['No transfer lines', 'No receipts recorded', 'No transfer events'])
    expect(screen.getByText(label)).toBeTruthy();
});
