import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';


export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Los iconos van como SVG en línea, sin @lucide/angular: 'shared' entra en el bundle inicial y, si importa
 * @lucide/angular, todo el módulo (con los iconos que usen las rutas diferidas) se queda en el chunk main.
 * Lo mismo vale para SearchBarComponent y cualquier otro componente de 'shared'.
 */
@Component({
  selector: 'lib-toast',
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  message = input.required<string>();
  type = input<ToastType>('success');
  duration = input<number>(3000);
  isVisible = input<boolean>(true);

  close = output<void>();

  handleClose(): void {
    this.close.emit();
  }
}
