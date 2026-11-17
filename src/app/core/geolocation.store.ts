import { Injectable, signal } from '@angular/core';
import { LatLng } from './models';

@Injectable({ providedIn: 'root' })
export class GeolocationStore {
  readonly position = signal<LatLng | null>(null);
  readonly status = signal<'idle' | 'locating' | 'ok' | 'denied' | 'unavailable'>('idle');

  locate(): void {
    if (!('geolocation' in navigator)) {
      this.status.set('unavailable');
      return;
    }
    this.status.set('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        this.position.set({ lat: p.coords.latitude, lng: p.coords.longitude });
        this.status.set('ok');
      },
      (e) => this.status.set(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }

  /** For demos and for users who prefer not to share location. */
  setManual(p: LatLng): void {
    this.position.set(p);
    this.status.set('ok');
  }
}
