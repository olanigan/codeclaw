export function pruneMapToMaxSize<K, V>(map: Map<K, V>, maxSize: number): void {
  const limit = Math.max(0, Math.floor(maxSize));
  if (limit <= 0) {
    map.clear();
    return;
  }

  const toRemove = map.size - limit;
  if (toRemove <= 0) {
    return;
  }

  const keys = map.keys();
  for (let i = 0; i < toRemove; i++) {
    const next = keys.next();
    if (next.done) {
      break;
    }
    map.delete(next.value);
  }
}
