import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
/** Bounded XLSX values-only reader. No macros, formulas, links or spreadsheet code execute. */
export function xlsxRows(bytes: Uint8Array): string[][] {
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
      { sheetData?: { row?: { c?: Cell[] }[] } } | undefined
  )?.sheetData?.row;
  if (!rows || rows.length > 101)
    throw new Error('Use the first worksheet with a header and at most 100 products.');
  return rows.map((row) => {
    const values = Array<string>(6).fill('');
    for (const cell of row.c ?? []) {
      if (cell.f !== undefined)
        throw new Error('Replace spreadsheet formulas with values before importing.');
      const col = cell['@_r']?.match(/^([A-Z]+)[0-9]+$/)?.[1];
      if (!col || col.length !== 1 || col < 'A' || col > 'F')
        throw new Error('Use only the six template columns.');
      const value =
        cell['@_t'] === 's'
          ? strings[Number(cell.v)]
          : cell['@_t'] === 'inlineStr'
            ? cell.is?.t
            : cell.v;
      values[col.charCodeAt(0) - 65] = String(value ?? '');
    }
    return values;
  });
}
