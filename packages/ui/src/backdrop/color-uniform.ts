/** Parse a resolved `#rrggbb` (or `rgb(...)`) colour into 0–1 floats for a shader uniform. */
export function toRgbFloat(color: string): [number, number, number] {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  const rgb = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb?.[1] && rgb[2] && rgb[3]) {
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  }

  return [1, 1, 1];
}
