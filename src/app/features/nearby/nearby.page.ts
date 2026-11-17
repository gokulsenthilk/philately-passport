import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LocationsStore } from '../../core/locations.store';
import { VisitsStore } from '../../core/visits.store';
import { GeolocationStore } from '../../core/geolocation.store';
import { clusterByRadius, distanceKm } from '../../core/geo';
import { StampLocation } from '../../core/models';
import { LocationCard } from '../../shared/location-card';
import { TranslatePipe } from '../../i18n/i18n.service';

type Pt = StampLocation & { lat: number; lng: number };

/** Approximate city-centre starting points for users who don't share location. */
const CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { name: 'Mangaluru', lat: 12.9141, lng: 74.856 },
  { name: 'Hubballi', lat: 15.3647, lng: 75.124 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
  { name: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047 },
];

@Component({
  selector: 'pp-nearby',
  imports: [LocationCard, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nearby.page.html',
  styleUrl: './nearby.page.scss',
})
export class NearbyPage {
  private readonly store = inject(LocationsStore);
  private readonly visits = inject(VisitsStore);
  protected readonly geo = inject(GeolocationStore);
  protected readonly cities = CITIES;

  protected readonly onlyTodo = signal(true);
  protected readonly radius = signal(40);
  protected readonly limit = signal(12);

  private readonly points = computed(() =>
    this.store.all().filter((l): l is Pt => l.lat !== null && l.lng !== null && (!this.onlyTodo() || !this.visits.visits()[l.id])),
  );

  protected readonly closest = computed(() => {
    const me = this.geo.position();
    if (!me) return [];
    return this.points()
      .map((l) => ({ l, d: distanceKm(me, l) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.limit());
  });

  protected readonly clusters = computed(() => {
    const me = this.geo.position();
    const list = clusterByRadius(this.points(), this.radius(), 3);
    return list
      .map((c) => ({ ...c, fromMe: me ? distanceKm(me, c.anchor) : null, districts: [...new Set(c.members.map((m) => m.district))] }))
      .sort((a, b) => (a.fromMe ?? 0) - (b.fromMe ?? 0) || b.members.length - a.members.length);
  });
}
