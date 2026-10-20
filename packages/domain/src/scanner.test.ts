import { expect, it } from 'vitest';
import { parseScan, ScanGate } from './scanner.js';
it('parses wedge terminators without stripping leading barcode zeros and rejects multiple scans', () => {
  expect(parseScan('0012345\r\n')).toBe('0012345');
  expect(() => parseScan('first\nsecond')).toThrow();
  expect(() => parseScan('')).toThrow();
  expect(() => parseScan('x'.repeat(121))).toThrow();
});
it('suppresses repeated camera callbacks while allowing intentional later scans', () => {
  const gate = new ScanGate();
  expect(gate.accept('001\r', 1000)).toBe('001');
  expect(gate.accept('001', 1100)).toBeNull();
  expect(gate.accept('002', 1200)).toBe('002');
  expect(gate.accept('001', 3000)).toBe('001');
});
