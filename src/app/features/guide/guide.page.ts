import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LocationsStore } from '../../core/locations.store';
import { TranslatePipe } from '../../i18n/i18n.service';

@Component({
  selector: 'pp-guide',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guide.page.html',
  styleUrl: './guide.page.scss',
})
export class GuidePage {
  private readonly store = inject(LocationsStore);
  protected readonly stats = computed(() => {
    const all = this.store.all();
    const by = (m: string) => all.filter((l) => l.geocode.method === m).length;
    return {
      ka: all.filter((l) => l.passport === 'KA').length,
      tn: all.filter((l) => l.passport === 'TN').length,
      tnPress: all.filter((l) => l.booklet.status === 'press-mentioned').length,
      osm: by('osm-post-office'),
      town: by('nominatim-locality'),
      geonames: by('geonames-locality'),
      centroid: by('pin-centroid'),
      conflicts: all.filter((l) => l.notes.some((n) => n.startsWith('PIN differs'))).length,
    };
  });
}
