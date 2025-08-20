import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container" [class]="containerClass">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .page-container {
      min-height: 90vh;
      background: linear-gradient(135deg, #263144 0%, #1a2332 100%);
      padding: 2rem 0;
      
      &.with-side-padding {
        padding: 2rem;
      }
      
      &.full-height {
        height: 100vh;
        overflow-y: auto;
      }
    }
    
    @media (max-width: 768px) {
      .page-container {
        padding: 1rem 0;
        
        &.with-side-padding {
          padding: 1rem;
        }
      }
    }
  `]
})
export class PageContainerComponent {
  @Input() containerClass: string = '';
}
