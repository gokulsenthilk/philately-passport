import { Injectable, computed, effect, signal } from '@angular/core';
import { Visit } from './models';

const KEY = 'pp.visits.v1';

/** Visit ticks are tiny, so they live in localStorage; photos go to IndexedDB (see PhotoStore). */
@Injectable({ providedIn: 'root' })
export class VisitsStore {
  private readonly state = signal<Record<string, Visit>>(this.load());

  readonly visits = this.state.asReadonly();
  readonly count = computed(() => Object.keys(this.state()).length);

  constructor() {
    effect(() => localStorage.setItem(KEY, JSON.stringify(this.state())));
  }

  isVisited = (id: string) => !!this.state()[id];
  get = (id: string): Visit | undefined => this.state()[id];

  mark(id: string, date = new Date().toISOString().slice(0, 10), note?: string): void {
    this.state.update((s) => ({ ...s, [id]: { id, date, note } }));
  }

  unmark(id: string): void {
    this.state.update(({ [id]: _, ...rest }) => rest);
  }

  toggle(id: string): void {
    this.isVisited(id) ? this.unmark(id) : this.mark(id);
  }

  exportJson(): string {
    return JSON.stringify({ version: 1, visits: this.state() }, null, 2);
  }

  importJson(text: string): void {
    const parsed = JSON.parse(text) as { visits?: Record<string, Visit> };
    if (parsed?.visits) this.state.set(parsed.visits);
  }

  private load(): Record<string, Visit> {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  }
}
