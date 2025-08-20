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
  `]
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() description: string = '';
}
