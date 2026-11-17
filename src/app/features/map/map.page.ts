import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, input, linkedSignal, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { LocationsStore } from '../../core/locations.store';
import { VisitsStore } from '../../core/visits.store';
import { GeolocationStore } from '../../core/geolocation.store';
import { PassportCode, StampLocation } from '../../core/models';
import { TranslatePipe } from '../../i18n/i18n.service';

type PassportFilter = PassportCode | 'ALL';
type StatusFilter = 'all' | 'todo' | 'done';

@Component({
  selector: 'pp-map',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.page.html',
  styleUrl: './map.page.scss',
})
export class MapPage implements OnDestroy {
  private readonly store = inject(LocationsStore);
  private readonly visits = inject(VisitsStore);
  private readonly geo = inject(GeolocationStore);
  private readonly router = inject(Router);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('map');

  /** Bound from ?passport=&district= query params. */
  readonly passport = input<PassportFilter>('ALL');
  readonly district = input<string>('');

  protected readonly passportF = linkedSignal<PassportFilter>(() => this.passport() || 'ALL');
  protected readonly districtF = linkedSignal(() => this.district() || '');
  protected readonly statusF = linkedSignal<StatusFilter>(() => 'all');

  protected readonly districts = computed(() => this.store.districts(this.passportF()));
  protected readonly filtered = computed(() =>
    this.store.all().filter((l) => {
      if (this.passportF() !== 'ALL' && l.passport !== this.passportF()) return false;
      if (this.districtF() && l.district !== this.districtF()) return false;
      const done = !!this.visits.visits()[l.id];
      if (this.statusF() === 'done' && !done) return false;
      if (this.statusF() === 'todo' && done) return false;
      return l.lat !== null && l.lng !== null;
    }),
  );
  protected readonly counts = computed(() => {
    const f = this.filtered();
    return { shown: f.length, done: f.filter((l) => this.visits.visits()[l.id]).length };
  });

  private map?: L.Map;
  private layer = L.layerGroup();
  private meLayer = L.layerGroup();

  constructor() {
    afterNextRender(() => this.initMap());
    effect(() => this.render(this.filtered(), this.visits.visits()));
    effect(() => {
      const me = this.geo.position();
      this.meLayer.clearLayers();
      if (me) L.circleMarker([me.lat, me.lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 }).bindTooltip('You').addTo(this.meLayer);
    });
  }

  protected setPassport(v: PassportFilter): void {
    this.passportF.set(v);
    this.districtF.set('');
  }

  protected locate(): void {
    this.geo.locate();
  }

  protected fit(): void {
    const pts = this.filtered().map((l) => [l.lat!, l.lng!] as L.LatLngTuple);
    if (pts.length && this.map) this.map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 12 });
  }

  private initMap(): void {
    this.map = L.map(this.host().nativeElement, { zoomControl: true, attributionControl: true }).setView([12.6, 77.3], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.meLayer.addTo(this.map);
    // Popups are plain HTML; route internal links through the Angular router.
    this.map.getContainer().addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a[data-route]');
      if (a) {
        e.preventDefault();
        void this.router.navigateByUrl(a.getAttribute('data-route')!);
      }
    });
    this.render(this.filtered(), this.visits.visits());
    this.fit();
  }

  private render(list: StampLocation[], visited: Record<string, unknown>): void {
    if (!this.map) return;
    this.layer.clearLayers();
    for (const l of list) {
      const done = !!visited[l.id];
      const approx = l.confidence.coords !== 'medium' && l.confidence.coords !== 'high';
      L.circleMarker([l.lat!, l.lng!], {
        radius: 7,
        weight: 2,
        color: done ? '#2b3f8f' : '#b3261e',
        dashArray: approx ? '3 3' : undefined,
        fillColor: done ? '#2b3f8f' : '#fffdf7',
        fillOpacity: done ? 0.85 : 0.95,
      })
        .bindPopup(popupHtml(l, done, approx))
        .addTo(this.layer);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function popupHtml(l: StampLocation, done: boolean, approx: boolean): string {
  return `
    <div class="pp-pop">
      <div class="kicker">${l.passport} · #${l.order} · ${esc(l.district)}</div>
      <strong style="font-family:var(--font-display);font-size:1.05rem">${esc(l.place)}</strong>
      <div>${esc(l.postOffice)} · PIN ${l.pin}${l.officeType ? ' · ' + l.officeType : ''}</div>
      ${approx ? `<div style="color:var(--amber);font-size:.78rem">Approximate pin (${esc(l.geocode.method)})</div>` : ''}
      <div style="margin-top:.4rem;display:flex;gap:.6rem">
        <a href="${new URL('location/' + l.id, document.baseURI).pathname}" data-route="/location/${l.id}">${done ? '✓ Collected · details' : 'Details & tick'}</a>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.postOffice + ' post office ' + l.pin)}" target="_blank" rel="noopener">Directions</a>
      </div>
    </div>`;
}
