/** Preserve approved inline italics across text and linked-author boundaries.
 * Other markup stays literal and is escaped by Svelte's normal text rendering.
 */
export const withInlineItalics = <T extends { value: string }>(parts: readonly T[]): Array<T & { italic: boolean }> => {
 const output: Array<T & { italic: boolean }> = [];
 let italic = false;
 for (const part of parts) {
  let start = 0;
  for (const tag of part.value.matchAll(/<\/?i>/g)) {
   if (tag.index! > start) output.push({ ...part, value: part.value.slice(start, tag.index), italic });
   italic = tag[0] === '<i>';
   start = tag.index! + tag[0].length;
  }
  if (start < part.value.length) output.push({ ...part, value: part.value.slice(start), italic });
 }
 return output;
};
