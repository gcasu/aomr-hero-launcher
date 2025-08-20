import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="text-center" [class]="containerClass">
      <div class="spinner-border" [class]="spinnerClass" role="status">
        <span class="visually-hidden">{{ loadingText | translate }}</span>
      </div>
      <p *ngIf="message" class="mt-3" [class]="messageClass">{{ message | translate }}</p>
    </div>
  `,
  styles: [`
    .spinner-border {
      color: #0d6efd;
    }
    
    .text-center {
      color: rgba(255, 255, 255, 0.9);
    }
    
    .text-muted {
      color: rgba(255, 255, 255, 0.6) !important;
    }
  `]
})
export class LoadingStateComponent {
  @Input() loadingText: string = 'COMMON.LOADING';
  @Input() message?: string;
  @Input() containerClass: string = 'py-4';
  @Input() spinnerClass: string = 'text-primary';
  @Input() messageClass: string = 'text-muted';
}
