// Code 39 symbol values (standard facts), cross-checked against ZXing Code39Reader.
// https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code39Reader.java
const symbols = [
  0x034, 0x121, 0x061, 0x160, 0x031, 0x130, 0x070, 0x025, 0x124, 0x064, 0x109, 0x049, 0x148, 0x019,
  0x118, 0x058, 0x085, 0x094,
];
const alphabet = '0123456789ABCDEF-*';
export function locationLabel(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new Error('Location UUID required');
  const value = id.toUpperCase(),
    bars: { x: number; width: number }[] = [];
  let x = 10;
  for (const char of `*${value}*`) {
    const mask = symbols[alphabet.indexOf(char)]!;
    for (let i = 0; i < 9; i++) {
      const width = mask & (1 << (8 - i)) ? 2 : 1;
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x++;
  }
  return { value, bars, width: x + 9 };
}
