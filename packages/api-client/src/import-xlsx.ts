import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
/** Bounded XLSX values-only reader. No macros, formulas, links or spreadsheet code execute. */
export function xlsxRows(bytes: Uint8Array, maximumColumns = 6): string[][] {
  let size = 0,
    count = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      size += file.originalSize;
      count++;
      if (size > 4 * 1024 * 1024 || count > 100)
        throw new Error('Spreadsheet exceeds the import limits.');
      return /^(xl\/(sharedStrings.xml|worksheets\/sheet1.xml))$/.test(file.name);
    },
  });
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
    isArray: (name) => ['si', 'r', 'row', 'c'].includes(name),
  });
  const xml = (name: string): Record<string, unknown> => {
    const source = files[name];
    if (!source) return {};
    const text = strFromU8(source);
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw new Error('Spreadsheet entity declarations are not supported.');
    return parser.parse(text) as Record<string, unknown>;
  };
  type Cell = { '@_r'?: string; '@_t'?: string; v?: string; f?: unknown; is?: { t?: string } };
  const strings =
    (
      xml('xl/sharedStrings.xml').sst as { si?: { t?: string; r?: { t?: string }[] }[] } | undefined
    )?.si?.map((v) => v.t ?? v.r?.map((r) => r.t ?? '').join('') ?? '') ?? [];
  const rows = (
    xml('xl/worksheets/sheet1.xml').worksheet as
      { sheetData?: { row?: { '@_r'?: string; c?: Cell[] }[] } } | undefined
  )?.sheetData?.row;
  if (!rows || rows.length > 101)
    throw new Error('Use the first worksheet with a header and at most 100 products.');
  const result: string[][] = [];
  for (const row of rows) {
    const number = row['@_r'] ? Number(row['@_r']) : result.length + 1;
    if (!Number.isInteger(number) || number <= result.length || number > 101)
      throw new Error('Worksheet row numbers must be ordered and within 101 rows.');
    while (result.length < number - 1) result.push([]);
    const values = Array<string>(maximumColumns === 6 ? 6 : 0).fill('');
    for (const cell of row.c ?? []) {
      if (cell.f !== undefined)
        throw new Error('Replace spreadsheet formulas with values before importing.');
      const col = cell['@_r']?.match(/^([A-Z]+)[0-9]+$/)?.[1];
      const column = [...(col ?? '')].reduce((total, c) => total * 26 + c.charCodeAt(0) - 64, 0);
      if (!column || column > maximumColumns)
        throw new Error(`Use at most ${maximumColumns} source columns.`);
      const value =
        cell['@_t'] === 's'
          ? strings[Number(cell.v)]
          : cell['@_t'] === 'inlineStr'
            ? cell.is?.t
            : cell.v;
      values[column - 1] = String(value ?? '');
    }
    result.push(Array.from(values, (v) => v ?? ''));
  }
  return result;
}
