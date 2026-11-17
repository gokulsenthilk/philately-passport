import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocationsStore } from '../../core/locations.store';
import { VisitsStore } from '../../core/visits.store';
import { PhotoStore } from '../../core/photo.store';
import { StampPhoto } from '../../core/models';
import { CancellationMark } from '../../shared/cancellation-mark';
import { ConfidenceBadge } from '../../shared/confidence-badge';
import { TranslatePipe } from '../../i18n/i18n.service';

interface PhotoView extends StampPhoto { url: string }

@Component({
  selector: 'pp-location',
  imports: [DatePipe, RouterLink, CancellationMark, ConfidenceBadge, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location.page.html',
  styleUrl: './location.page.scss',
})
export class LocationPage {
  private readonly store = inject(LocationsStore);
  protected readonly visits = inject(VisitsStore);
  private readonly photoStore = inject(PhotoStore);

  readonly id = input.required<string>();
  protected readonly loc = computed(() => this.store.byId().get(this.id()));
  protected readonly visit = computed(() => this.visits.visits()[this.id()]);
  protected readonly photos = signal<PhotoView[]>([]);
  protected readonly busy = signal(false);
  protected readonly confidenceRows = computed(() => {
    const c = this.loc()?.confidence;
    return c ? (Object.entries(c) as [string, (typeof c)[keyof typeof c]][]) : [];
  });
  protected readonly mapsUrl = computed(() => {
    const l = this.loc();
    if (!l) return '';
    const q = l.confidence.coords === 'medium' && l.lat ? `${l.lat},${l.lng}` : `${l.postOffice} post office ${l.pin}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  });
  protected readonly osmUrl = computed(() => {
    const l = this.loc();
    return l?.lat ? `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=14/${l.lat}/${l.lng}` : '';
  });

  constructor() {
    effect(() => void this.loadPhotos(this.id()));
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  protected async onFiles(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    if (!files.length) return;
    this.busy.set(true);
    try {
      for (const f of files) await this.photoStore.add(this.id(), f);
      if (!this.visit()) this.visits.mark(this.id());
      await this.loadPhotos(this.id());
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  protected async remove(p: PhotoView): Promise<void> {
    await this.photoStore.remove(p.key);
    await this.loadPhotos(this.id());
  }

  protected setDate(date: string): void {
    if (date) this.visits.mark(this.id(), date, this.visit()?.note);
  }

  protected setNote(note: string): void {
    const v = this.visit();
    if (v) this.visits.mark(v.id, v.date, note);
  }

  private async loadPhotos(id: string): Promise<void> {
    const list = await this.photoStore.list(id);
    this.revoke();
    this.photos.set(list.sort((a, b) => a.createdAt - b.createdAt).map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })));
  }

  private revoke(): void {
    this.photos().forEach((p) => URL.revokeObjectURL(p.url));
  }
}
