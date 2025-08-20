import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-glass-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="table-responsive">
      <table class="table table-dark table-striped table-hover glass-table">
        <thead class="table-dark">
          <tr>
            <th 
              *ngFor="let column of columns" 
              scope="col" 
              [class]="'text-' + (column.align || 'left')"
              [style.width]="column.width">
              {{ column.label | translate }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of data; trackBy: trackByFn" class="table-row">
            <ng-container *ngFor="let column of columns">
              <td [class]="'text-' + (column.align || 'left')">
                <ng-container 
                  [ngTemplateOutlet]="cellTemplate" 
                  [ngTemplateOutletContext]="{ item: item, column: column }">
                </ng-container>
              </td>
            </ng-container>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .glass-table {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      overflow: hidden;
      
      thead th {
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        font-weight: 600;
        padding: 1rem 0.75rem;
      }
      
      tbody {
        tr {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
          
          &:hover {
            background: rgba(255, 255, 255, 0.08) !important;
          }
          
          td {
            padding: 1rem 0.75rem;
            vertical-align: middle;
            color: rgba(255, 255, 255, 0.9);
          }
        }
      }
    }
  `]
})
export class GlassTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() cellTemplate!: TemplateRef<any>;
  @Input() trackByFn: (index: number, item: any) => any = (index, item) => item.id || index;
}
