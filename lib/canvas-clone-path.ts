export function storagePathExtension(path: string) {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot);
}

export function clonedMediaPath(userId: string, objectId: string, sourcePath: string) {
  return `${userId}/${objectId}${storagePathExtension(sourcePath)}`;
}

export function clonedOgPath(userId: string, itemId: string) {
  return `${userId}/og/${itemId}.jpg`;
}
