export function getTextLength(value: string): number {
  return Array.from(value ?? "").length;
}

export function isReviewLengthValid(content: string): boolean {
  const length = getTextLength(content);
  return length >= 200 && length <= 800;
}
