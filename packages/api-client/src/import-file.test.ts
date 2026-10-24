import { expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseCsv, readImportFile, productImportTemplate } from './import-file.js';
it('parses quoted cells, validates rows and rejects malformed content', async () => {
  expect(parseCsv('a,b\r\n"one,two","a""b"')).toEqual([
    ['a', 'b'],
    ['one,two', 'a"b'],
  ]);
  expect(await readImportFile(strToU8(productImportTemplate), 'test.csv')).toHaveLength(1);
  await expect(
    readImportFile(strToU8(productImportTemplate.replace('12.50', '-2')), 'test.csv'),
  ).rejects.toThrow('Row 2');
  expect(() => parseCsv('"unterminated')).toThrow();
});
it('reads XLSX cell values and rejects formulas', async () => {
  const rows = productImportTemplate
    .trim()
    .split('\r\n')
    .map(
      (line, r) =>
        `<row>${line
          .split(',')
          .map(
            (v, c) =>
              `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${v}</t></is></c>`,
          )
          .join('')}</row>`,
    )
    .join('');
  const source = `<worksheet><sheetData>${rows}</sheetData></worksheet>`;
  const file = (text: string) => zipSync({ 'xl/worksheets/sheet1.xml': strToU8(text) });
  expect(await readImportFile(file(source), 'data.xlsx')).toHaveLength(1);
  await expect(
    readImportFile(file(source.replace('<is>', '<f>1+1</f><is>')), 'data.xlsx'),
  ).rejects.toThrow('formulas');
});
