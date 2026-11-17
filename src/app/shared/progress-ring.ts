import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'pp-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row">
      <span class="label">{{ label() }}</span>
      <span class="num">{{ done() }}/{{ total() }}</span>
    </div>
    <div class="track" role="progressbar" [attr.aria-valuenow]="done()" [attr.aria-valuemax]="total()" [attr.aria-label]="label()">
      <div class="fill" [style.width.%]="pct()"></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .row { display: flex; justify-content: space-between; font-size: .9rem; margin-bottom: 4px; }
    .num { font-family: var(--font-mono); color: var(--ink-soft); }
    .track { height: 8px; background: var(--paper-deep); border-radius: 99px; overflow: hidden; border: 1px solid var(--line); }
    .fill { height: 100%; background: linear-gradient(90deg, var(--postal-red), var(--amber)); transition: width .4s; }
  `,
})
export class ProgressBar {
  readonly label = input('');
  readonly done = input(0);
  readonly total = input(0);
  readonly pct = computed(() => (this.total() ? (100 * this.done()) / this.total() : 0));
}
