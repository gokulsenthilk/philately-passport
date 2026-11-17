import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocationsStore } from '../../core/locations.store';
import { VisitsStore } from '../../core/visits.store';
import { PhotoStore } from '../../core/photo.store';
import { ProgressBar } from '../../shared/progress-ring';
import { TranslatePipe } from '../../i18n/i18n.service';

@Component({
  selector: 'pp-progress',
  imports: [RouterLink, ProgressBar, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.page.html',
  styleUrl: './progress.page.scss',
})
export class ProgressPage {
  private readonly store = inject(LocationsStore);
  protected readonly visits = inject(VisitsStore);
  private readonly photos = inject(PhotoStore);
  protected readonly message = signal('');

  protected readonly summary = computed(() =>
    this.store.passports.map((code) => {
      const list = this.store.forPassport(code);
      const v = this.visits.visits();
      const byDistrict = new Map<string, { total: number; done: number }>();
      for (const l of list) {
        const d = byDistrict.get(l.district) ?? { total: 0, done: 0 };
        d.total++;
        if (v[l.id]) d.done++;
        byDistrict.set(l.district, d);
      }
      return {
        code,
        meta: this.store.meta()?.passports[code],
        done: list.filter((l) => v[l.id]).length,
        total: list.length,
        districts: [...byDistrict.entries()].map(([name, s]) => ({ name, ...s })).sort((a, b) => b.done / b.total - a.done / a.total || a.name.localeCompare(b.name)),
      };
    }),
  );
  protected readonly photoTotal = computed(() => Object.values(this.photos.counts()).reduce((a, b) => a + b, 0));

  protected export(): void {
    const blob = new Blob([this.visits.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `philately-passport-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected async import(ev: Event): Promise<void> {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      this.visits.importJson(await f.text());
      this.message.set('Backup restored.');
    } catch {
      this.message.set('That file is not a valid backup.');
    }
  }
}
