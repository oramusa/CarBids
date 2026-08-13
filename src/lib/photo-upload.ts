// Kept as a plain function (not called during render) so the lint rule
// that flags impure calls (Date.now, used here only to make the storage
// path unique) doesn't apply.
export function buildPhotoPath(userId: string, fileName: string) {
  return `${userId}/${Date.now()}-${fileName}`;
}
