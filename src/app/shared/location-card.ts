import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StampLocation } from '../core/models';
import { VisitsStore } from '../core/visits.store';
import { PhotoStore } from '../core/photo.store';
import { CancellationMark } from './cancellation-mark';
import { TranslatePipe } from '../i18n/i18n.service';

/** Compact row used by lists (near me, clusters). */
@Component({
  selector: 'pp-location-card',
  imports: [RouterLink, CancellationMark, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="row card" [routerLink]="['/location', loc().id]">
      <pp-cancellation-mark [office]="loc().postOffice" [pin]="loc().pin" [date]="visit()?.date" [seed]="loc().id" />
      <div class="body">
        <span class="kicker">{{ loc().passport }} · {{ loc().district }}</span>
        <strong>{{ loc().place }}</strong>
        <span class="muted">{{ loc().postOffice }} · {{ loc().pin }}</span>
        @if (photoCount()) { <span class="muted">📷 {{ photoCount() }}</span> }
      </div>
      @if (distanceKm() !== null) {
        <span class="dist mono">{{ distanceKm()!.toFixed(distanceKm()! < 10 ? 1 : 0) }} {{ 'common.km' | t }}</span>
      }
    </a>
  `,
  styles: `
    .row { display: flex; align-items: center; gap: .8rem; text-decoration: none; color: inherit; padding: .6rem .8rem; --mark-size: 64px; }
    .body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .body strong { font-family: var(--font-display); font-size: 1.02rem; }
    .body .muted { font-size: .82rem; }
    .dist { font-size: .85rem; color: var(--postal-red); white-space: nowrap; }
  `,
})
export class LocationCard {
  private readonly visits = inject(VisitsStore);
  private readonly photos = inject(PhotoStore);
  readonly loc = input.required<StampLocation>();
  readonly distanceKm = input<number | null>(null);
  readonly visit = computed(() => this.visits.visits()[this.loc().id]);
  readonly photoCount = computed(() => this.photos.counts()[this.loc().id] ?? 0);
}
