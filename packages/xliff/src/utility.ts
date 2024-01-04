export function escapeXmlText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function unescapeXmlText(xmlText: string) {
  return xmlText
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function attributesToString(
  attributes: Record<string, any> | undefined,
): string {
  if (!attributes) return '';
  return `${Object.entries(attributes)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${escapeXmlText(`${value}`)}"`)
    .join(' ')}`;
}

export function assert(claim: any, message: string): asserts claim {
  if (!claim) throw new Error(message);
}
