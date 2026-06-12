import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'edu-enroll-result-banner',
  standalone: true,
  templateUrl: './enroll-result-banner.html',
  styleUrl: './enroll-result-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollResultBanner {
  readonly success = input<number>(0);
  readonly skipped = input<number>(0);
  readonly errors  = input<string[]>([]);
}
