export function formatShelfMetadata(creator: string, sourceName?: string): string {
  return [creator, sourceName].filter(Boolean).join(' · ');
}
