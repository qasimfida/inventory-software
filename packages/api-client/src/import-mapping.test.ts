import { expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  readImportSource,
  mapImportSource,
  mappingIssues,
  suggestedImportMapping,
  importSourceWarning,
} from './import-mapping.js';
it('previews arbitrary headers and validates every mapped row with exact source row numbers', async () => {
  const source = await readImportSource(
    strToU8('Code,Title,Amount,Money,Units\nA,Paint,12.50,USD,0\na,Other,-1,USD,2\nB,,5,ZZZ,0'),
    'custom.csv',
  );
  const mapping = {
    sku: 'Code',
    name: 'Title',
    price: 'Amount',
    currency: 'Money',
    quantity: 'Units',
    description: '',
  };
  expect(mappingIssues(source, mapping)).toEqual([]);
  const result = mapImportSource(source, mapping, '');
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ row: 2, field: 'sku' }),
      expect.objectContaining({ row: 3, field: 'price' }),
      expect.objectContaining({ row: 4, field: 'name' }),
      expect.objectContaining({ row: 4, field: 'currency' }),
    ]),
  );
  expect(source.rows[1]![0]).toBe('a');
});
it('blocks missing saved-template columns and duplicate destination mappings', async () => {
  const source = await readImportSource(
    strToU8('sku,name,price,currency\nABC,Paint,4.5,USD'),
    'source.csv',
  );
  const mapping = suggestedImportMapping(source);
  expect(mappingIssues(source, mapping)).toEqual([]);
  expect(mapImportSource(source, mapping, '').rows[0]?.quantity).toBe('0');
  expect(mappingIssues(source, { ...mapping, name: 'old name' }).join(' ')).toContain('missing');
  expect(mappingIssues(source, { ...mapping, name: 'sku' }).join(' ')).toContain('only one');
});
it('retains blank row numbers, flags identical rows and rejects bad files', async () => {
  const source = await readImportSource(
    strToU8('sku,name,price,currency\nA,Paint,1,USD\n\nA,Paint,1,USD'),
    'source.csv',
  );
  expect(importSourceWarning(source, 1)).toContain('Empty row');
  expect(importSourceWarning(source, 2)).toContain('row 2');
  for (const text of ['same,same\na,b', 'sku,,price\na,b,c', 'sku,name\na,b,c'])
    await expect(readImportSource(strToU8(text), 'source.csv')).rejects.toThrow();
  await expect(readImportSource(new Uint8Array(1024 * 1024 + 1), 'a.csv')).rejects.toThrow('1 MiB');
  await expect(readImportSource(strToU8('a\nb'), 'a.exe')).rejects.toThrow('CSV or XLSX');
});
it('reads columns beyond F without executing formulas or losing physical row numbers', async () => {
  const cells = Array.from({ length: 8 }, (item, i) => {
    void item;
    return `<c r="${String.fromCharCode(65 + i)}1" t="inlineStr"><is><t>Column ${i}</t></is></c>`;
  }).join('');
  const file = (body: string) =>
    zipSync({
      'xl/worksheets/sheet1.xml': strToU8(
        `<worksheet><sheetData><row r="1">${cells}</row><row r="3">${body}</row></sheetData></worksheet>`,
      ),
    });
  const source = await readImportSource(file('<c r="H3"><v>42</v></c>'), 'sample.xlsx');
  expect(source.rows[1]![7]).toBe('42');
  expect(source.rows[0]!.every((v) => !v)).toBe(true);
  await expect(
    readImportSource(file('<c r="H3"><f>1+1</f><v>2</v></c>'), 'bad.xlsx'),
  ).rejects.toThrow('formulas');
});
