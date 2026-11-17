import { Injectable, signal } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { StampPhoto } from './models';

interface PassportDb extends DBSchema {
  photos: { key: string; value: StampPhoto; indexes: { byLocation: string } };
}

/** Photo log of real ink cancellations, stored only on this device (IndexedDB). */
@Injectable({ providedIn: 'root' })
export class PhotoStore {
  private readonly db: Promise<IDBPDatabase<PassportDb>> = openDB<PassportDb>('philately-passport', 1, {
    upgrade(db) {
      db.createObjectStore('photos', { keyPath: 'key' }).createIndex('byLocation', 'locationId');
    },
  });

  /** locationId -> number of photos; refreshed on every write. */
  readonly counts = signal<Record<string, number>>({});

  constructor() {
    void this.refreshCounts();
  }

  async list(locationId: string): Promise<StampPhoto[]> {
    return (await this.db).getAllFromIndex('photos', 'byLocation', locationId);
  }

  async add(locationId: string, file: Blob): Promise<void> {
    const blob = await downscale(file, 1600);
    await (await this.db).put('photos', { key: crypto.randomUUID(), locationId, blob, createdAt: Date.now() });
    await this.refreshCounts();
  }

  async remove(key: string): Promise<void> {
    await (await this.db).delete('photos', key);
    await this.refreshCounts();
  }

  private async refreshCounts(): Promise<void> {
    const tx = (await this.db).transaction('photos');
    const counts: Record<string, number> = {};
    let cursor = await tx.store.index('byLocation').openKeyCursor();
    while (cursor) {
      counts[cursor.key] = (counts[cursor.key] ?? 0) + 1;
      cursor = await cursor.continue();
    }
    this.counts.set(counts);
  }
}

/** Keep IndexedDB small: re-encode large camera photos to JPEG with a max edge. */
async function downscale(file: Blob, maxEdge: number): Promise<Blob> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1_500_000) return file;
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
