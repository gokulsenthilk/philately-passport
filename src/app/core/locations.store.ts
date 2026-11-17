import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Dataset, PassportCode, StampLocation } from './models';

@Injectable({ providedIn: 'root' })
export class LocationsStore {
  private readonly resource = httpResource<Dataset>(() => 'data/locations.json');

  readonly loading = this.resource.isLoading;
  readonly error = this.resource.error;
  readonly meta = computed(() => this.resource.value()?.meta ?? null);
  readonly all = computed<StampLocation[]>(() => this.resource.value()?.locations ?? []);
  readonly byId = computed(() => new Map(this.all().map((l) => [l.id, l])));

  readonly passports: PassportCode[] = ['KA', 'TN'];

  forPassport(code: PassportCode): StampLocation[] {
    return this.all()
      .filter((l) => l.passport === code)
      .sort((a, b) => a.order - b.order);
  }

  districts(code: PassportCode | 'ALL'): string[] {
    const set = new Set(this.all().filter((l) => code === 'ALL' || l.passport === code).map((l) => l.district));
    return [...set].sort();
  }
}
