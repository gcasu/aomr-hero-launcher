import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glass-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card" [class]="cardClass">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .glass-card {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
      
      &.interactive {
        cursor: pointer;
        
        &:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
      }
      
      &.padded {
        padding: 2rem;
      }
      
      &.small-padding {
        padding: 1.5rem;
      }
      
      &.large-padding {
        padding: 3rem;
      }
    }
  `]
})
export class GlassCardComponent {
  @Input() cardClass: string = '';
}
