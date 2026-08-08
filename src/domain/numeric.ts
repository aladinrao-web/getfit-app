export function normalizeNumericDraft(value: string) {
  return value.replace(/^(-?)0+(?=\d)/, '$1')
}
