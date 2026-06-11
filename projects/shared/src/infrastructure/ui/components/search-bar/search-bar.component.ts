import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'lib-search-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  placeholder = input<string>('Search...');
  debounceTime = input<number>(300);
  value = input<string>('');
  
  search = output<string>();
  clear = output<void>();

  searchControl = new FormControl('');

  ngOnInit() {
    // Set initial value
    if (this.value()) {
      this.searchControl.setValue(this.value(), { emitEvent: false });
    }

    // Listen to changes with debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(this.debounceTime()),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.search.emit(value || '');
      });
  }

  onClear(): void {
    this.searchControl.setValue('');
    this.clear.emit();
  }

  get hasValue(): boolean {
    return !!this.searchControl.value;
  }
}
