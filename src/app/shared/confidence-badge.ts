import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Confidence } from '../core/models';

@Component({
  selector: 'pp-confidence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [attr.data-level]="level()" [title]="title()">{{ level() }}</span>`,
  styles: `
    .badge { font: 600 10px/1 var(--font-mono); text-transform: uppercase; letter-spacing: .06em; padding: 3px 6px; border-radius: 3px; border: 1px solid currentColor; }
    [data-level='high'] { color: var(--ok); }
    [data-level='medium'] { color: var(--ink-blue); }
    [data-level='low'], [data-level='missing'] { color: var(--postal-red); }
    [data-level='approximate'], [data-level='editorial'] { color: var(--amber); }
  `,
})
export class ConfidenceBadge {
  readonly level = input.required<Confidence>();
  readonly title = input<string>('');
}
