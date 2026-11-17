import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocationsStore } from '../../core/locations.store';
import { VisitsStore } from '../../core/visits.store';
import { PhotoStore } from '../../core/photo.store';
import { PassportCode } from '../../core/models';
import { CancellationMark } from '../../shared/cancellation-mark';
import { ProgressBar } from '../../shared/progress-ring';
import { TranslatePipe } from '../../i18n/i18n.service';

@Component({
  selector: 'pp-passport',
  imports: [RouterLink, CancellationMark, ProgressBar, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './passport.page.html',
  styleUrl: './passport.page.scss',
})
export class PassportPage {
  protected readonly store = inject(LocationsStore);
  protected readonly visits = inject(VisitsStore);
  protected readonly photos = inject(PhotoStore);

  /** Route param. */
  readonly code = input<PassportCode>('KA');
  protected readonly query = signal('');
  protected readonly district = signal('');

  protected readonly meta = computed(() => this.store.meta()?.passports[this.code()]);
  protected readonly pages = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.store.forPassport(this.code()).filter(
      (l) =>
        (!this.district() || l.district === this.district()) &&
        (!q || `${l.place} ${l.ppcTheme} ${l.postOffice} ${l.pin} ${l.district}`.toLowerCase().includes(q)),
    );
  });
  protected readonly districts = computed(() => this.store.districts(this.code()));
  protected readonly done = computed(() => this.store.forPassport(this.code()).filter((l) => this.visits.visits()[l.id]).length);

  protected setDate(id: string, date: string): void {
    if (date) this.visits.mark(id, date, this.visits.get(id)?.note);
  }
}
