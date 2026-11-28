type Listener = (message: string) => void;

const listeners = new Set<Listener>();

/** Kirim satu pengumuman status ke wilayah live global. */
export function announceSave(message: string): void {
  for (const listener of listeners) listener(message);
}

export function subscribeAutosave(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
