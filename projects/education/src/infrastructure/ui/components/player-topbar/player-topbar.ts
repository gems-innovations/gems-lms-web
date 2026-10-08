import { Component, ElementRef, HostListener, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'edu-player-topbar',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-topbar.html',
  styleUrl: './player-topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTopbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly courseTitle  = input<string>('');
  readonly lessonTitle  = input<string | undefined>(undefined);
  readonly hasPrev      = input<boolean>(false);
  readonly hasNext      = input<boolean>(false);
  readonly progress     = input<number>(0);

  readonly goHome = output<void>();
  readonly openGrades = output<void>();
  readonly openCommunity = output<void>();
  readonly openProgress = output<void>();
  readonly prev   = output<void>();
  readonly next   = output<void>();

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  protected choose(action: { emit: () => void }): void {
    this.menuOpen.set(false);
    action.emit();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    const more = this.host.nativeElement.querySelector('.player-topbar__more');
    if (!more?.contains(event.target as Node)) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.menuOpen.set(false);
  }
}
