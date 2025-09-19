import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header text-center mb-5">
      <h1 class="display-4 text-white mb-3">{{ title | translate }}</h1>
      <p class="lead text-light">{{ description | translate }}</p>
      
      <!-- Info Banner -->
      <div class="info-section mt-4" *ngIf="bannerMessage">
        <div class="info-card">
          <i class="fas fa-info-circle text-info me-2"></i>
          <span class="info-text text-light">
            {{ bannerMessage | translate }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 3rem;
      
      h1 {
        font-family: 'Maiola', sans-serif;
        font-weight: normal;
        color: rgba(255, 255, 255, 0.9);
      }
      
      p {
        font-family: 'Noto Sans', sans-serif;
        color: rgba(255, 255, 255, 0.7);
        font-size: 1.2rem;
      }
    }
    
    .info-section {
      display: flex;
      justify-content: center;
      
      .info-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        display: inline-flex;
        align-items: center;
        backdrop-filter: blur(10px);
        
        .info-text {
          font-size: 0.875rem;
          font-style: italic;
        }
        
        .fa-info-circle {
          font-size: 1rem;
        }
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() bannerMessage: string = '';
}
