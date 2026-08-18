export function shouldReleasePendingUpload(
  pendingPath: string | null | undefined,
  initialPath: string | null | undefined,
) {
  return Boolean(pendingPath) && pendingPath === initialPath;
}

export function shouldDeletePendingUpload(
  pendingPath: string | null | undefined,
  initialPath: string | null | undefined,
) {
  return Boolean(pendingPath) && pendingPath !== initialPath;
}
