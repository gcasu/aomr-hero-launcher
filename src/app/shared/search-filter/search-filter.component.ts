import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-search-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchFilterComponent),
      multi: true
    }
  ],
  template: `
    <div class="filter-section mb-4">
      <div class="row justify-content-center align-items-center">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text">
              <i class="fas fa-search"></i>
            </span>
            <label [for]="inputId" class="visually-hidden">
              {{ placeholder | translate }}
            </label>
            <input 
              [id]="inputId"
              type="text" 
              class="form-control" 
              [value]="value"
              (input)="onInput($event)"
              (blur)="onBlur()"
              [placeholder]="placeholder | translate"
              [title]="placeholder | translate"
              [attr.aria-label]="placeholder | translate">
          </div>
        </div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .filter-section {
      margin-bottom: 2rem;
      padding: 0 1rem;
      
      .input-group-text {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: #fff !important;
      }
      
      .form-control {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: #fff !important;
        
        &::placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        
        &:focus {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: #0d6efd !important;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
          color: #fff !important;
        }
      }
      
      .form-check-input {
        cursor: pointer;
      }
      
      .form-check-label {
        cursor: help;
      }
    }
  `]
})
export class SearchFilterComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'COMMON.SEARCH_PLACEHOLDER';
  @Input() inputId: string = 'filterInput';
  @Output() filterChange = new EventEmitter<string>();

  value: string = '';
  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    this.filterChange.emit(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
