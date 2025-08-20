import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-path-input',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="mb-4">
      <label [for]="inputId" class="form-label">
        <i [class]="iconClass + ' me-2'"></i>
        {{ label | translate }}
      </label>
      <div class="input-group">
        <input 
          type="text" 
          class="form-control" 
          [id]="inputId"
          [value]="value"
          [placeholder]="placeholder | translate"
          readonly>
        <button 
          class="btn btn-outline-light" 
          type="button"
          (click)="onBrowseClick()"
          [disabled]="disabled">
          <i class="fas fa-folder-open me-1"></i>
          {{ browseText | translate }}
        </button>
      </div>
      <div class="form-text" *ngIf="helpText">{{ helpText | translate }}</div>
      <div *ngIf="error" class="alert alert-danger mt-2 py-2">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{ error }}
      </div>
      <div *ngIf="value && !error && showValid" class="alert alert-success mt-2 py-2">
        <i class="fas fa-check-circle me-2"></i>
        {{ validMessage | translate }}
      </div>
    </div>
  `,
  styles: [`
    .form-label {
      color: #ffffff;
      font-weight: 500;
      margin-bottom: 0.75rem;
      font-family: 'Maiola', sans-serif;
      
      i {
        color: #CDA351;
      }
    }

    .form-control {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      
      &:focus {
        background: rgba(255, 255, 255, 0.15);
        border-color: #CDA351;
        box-shadow: 0 0 0 0.2rem rgba(205, 163, 81, 0.25);
        color: #ffffff;
      }
      
      &::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .btn-outline-light {
      border-color: rgba(255, 255, 255, 0.5);
      color: #ffffff;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: #ffffff;
        color: #ffffff;
      }
    }

    .form-text {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
      font-family: 'Noto Sans', sans-serif;
    }

    .alert {
      border: none;
      border-radius: 8px;
      font-family: 'Noto Sans', sans-serif;
      
      &.alert-danger {
        background: rgba(220, 53, 69, 0.2);
        color: #f8d7da;
      }
      
      &.alert-success {
        background: rgba(25, 135, 84, 0.2);
        color: #d1e7dd;
      }
    }
  `]
})
export class PathInputComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() browseText = '';
  @Input() helpText = '';
  @Input() validMessage = '';
  @Input() error = '';
  @Input() iconClass = 'fas fa-folder';
  @Input() inputId = '';
  @Input() disabled = false;
  @Input() showValid = true;
  
  @Output() browseClick = new EventEmitter<void>();
  
  onBrowseClick() {
    this.browseClick.emit();
  }
}
