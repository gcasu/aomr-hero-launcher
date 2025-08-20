import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'light' | 'dark';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ],
  template: `
    <span 
      [class]="getBadgeClasses()"
      [attr.title]="tooltip">
      <i *ngIf="iconClass" [class]="iconClass + ' me-1'"></i>
      <span *ngIf="textKey; else directText">{{ textKey | translate }}</span>
      <ng-template #directText>{{ text }}</ng-template>
    </span>
  `,
  styleUrl: './badge.component.scss'
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'secondary';
  @Input() textKey?: string;
  @Input() text?: string;
  @Input() iconClass?: string;
  @Input() tooltip?: string;
  @Input() customClass?: string;

  getBadgeClasses(): string {
    const classes = ['badge'];
    
    // Variant class
    classes.push(`bg-${this.variant}`);
    
    // Custom classes
    if (this.customClass) {
      classes.push(this.customClass);
    }
    
    return classes.join(' ');
  }
}
