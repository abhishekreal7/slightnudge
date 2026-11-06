/** Archive browser-only work before reconnecting to externally changed source. */
export function backUpConflictedDraft(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  key: string,
  backupId: string,
  fallback?: string,
) {
  const raw = fallback ?? storage.getItem(key);
  if (!raw) throw new Error('No draft is available to back up. Your editing session was not cleared.');
  const backupKey = `${key}:backup:${backupId}`;
  if (storage.getItem(backupKey) !== null) throw new Error('A draft backup already exists at this location. Please try again.');
  storage.setItem(backupKey, raw);
  if (storage.getItem(backupKey) !== raw) throw new Error('Could not verify the draft backup. Your editing session was not cleared.');
  storage.removeItem(key);
  return backupKey;
}

export function isDraftSourceConflict(message: string) {
  return message.toLowerCase().includes('source changed outside this draft');
}
