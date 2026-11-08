// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { countDetailSchema } from '@inventory/contracts';
import { CountEvidence } from './CountEvidence';
afterEach(cleanup);
it('keeps blind values hidden, exact captured quantities and stale-count warning visible', () => {
  const detail = countDetailSchema.parse(createDemoSeed(0, 'owner').counts[0]);
  const line = { ...detail.lines[0]!, counted: '0.250001', expected: null, stale: true };
  render(<CountEvidence detail={{ ...detail, lines: [line] }} />);
  expect(screen.getByText('Hidden')).toBeTruthy();
  expect(screen.getByText('0.250001')).toBeTruthy();
  expect(screen.getByText('Recount required')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
it('provides an explicit empty state without inventing count lines', () => {
  const detail = countDetailSchema.parse(createDemoSeed(0, 'owner').counts[0]);
  render(<CountEvidence detail={{ ...detail, lines: [] }} />);
  expect(screen.getByText('No count lines')).toBeTruthy();
});
