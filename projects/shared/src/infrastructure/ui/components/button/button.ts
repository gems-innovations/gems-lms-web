import { Component, input, output } from '@angular/core';


@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss'
})
export class ButtonComponent {
  public type = input<'button' | 'submit' | 'reset'>('button');
  public variant = input<'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'>('primary');
  public size = input<'sm' | 'md' | 'lg'>('md');
  public disabled = input<boolean>(false);
  public loading = input<boolean>(false);
  public fullWidth = input<boolean>(false);
  public icon = input<string>();
  public iconPosition = input<'left' | 'right'>('left');
  
  public onClick = output<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.onClick.emit(event);
    }
  }
}