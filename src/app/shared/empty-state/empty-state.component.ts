import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="empty-state text-center">
      <i [class]="iconClass" style="font-size: 4rem;" *ngIf="iconClass"></i>
      <h3>{{ title | translate }}</h3>
      <p>{{ description | translate }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state {
      padding: 4rem 2rem;
      
      i {
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 1.5rem;
      }
      
      h3 {
        font-family: 'Maiola', sans-serif;
        color: #fff;
        margin-bottom: 1rem;
      }
      
      p {
        font-family: 'Noto Sans', sans-serif;
        font-size: 1.1rem;
        margin-bottom: 2rem;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .btn {
        font-family: 'Noto Sans', sans-serif;
        font-weight: 500;
        padding: 0.75rem 2rem;
        border-radius: 8px;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() iconClass: string = 'fas fa-inbox';
}
