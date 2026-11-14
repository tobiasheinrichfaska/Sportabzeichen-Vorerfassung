// Ids for new entries. crypto.getRandomValues works in every context (also file://, where
// crypto.randomUUID may be missing because the page is not a secure context).

export function newId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
