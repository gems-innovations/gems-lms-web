import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'edu-player-topbar',
  templateUrl: './player-topbar.html',
  styleUrl: './player-topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTopbar {
  readonly courseTitle  = input<string>('');
  readonly lessonTitle  = input<string | undefined>(undefined);
  readonly hasPrev      = input<boolean>(false);
  readonly hasNext      = input<boolean>(false);

  readonly goHome = output<void>();
  readonly prev   = output<void>();
  readonly next   = output<void>();
}
