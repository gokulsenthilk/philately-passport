import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocationsStore } from '../../core/locations.store';
import { VisitsStore } from '../../core/visits.store';
import { ProgressBar } from '../../shared/progress-ring';
import { TranslatePipe } from '../../i18n/i18n.service';
import { LocationCard } from '../../shared/location-card';
import { PassportCode } from '../../core/models';

@Component({
  selector: 'pp-home',
  imports: [RouterLink, ProgressBar, TranslatePipe, LocationCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly store = inject(LocationsStore);
  private readonly visits = inject(VisitsStore);

  protected readonly cards = computed(() =>
    this.store.passports.map((code: PassportCode) => {
      const list = this.store.forPassport(code);
      const meta = this.store.meta()?.passports[code];
      return {
        code,
        meta,
        total: list.length,
        done: list.filter((l) => this.visits.visits()[l.id]).length,
        districts: new Set(list.map((l) => l.district)).size,
      };
    }),
  );

  protected readonly recent = computed(() =>
    Object.values(this.visits.visits())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4)
      .map((v) => this.store.byId().get(v.id))
      .filter((l) => !!l),
  );
}
