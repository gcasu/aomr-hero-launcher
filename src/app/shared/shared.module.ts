import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

// Import shared components
import { ToastContainerComponent } from './toast-container/toast-container.component';
import { PageHeaderComponent } from './page-header/page-header.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { SearchFilterComponent } from './search-filter/search-filter.component';
import { PageContainerComponent } from './page-container/page-container.component';
import { GlassCardComponent } from './glass-card/glass-card.component';
import { LoadingStateComponent } from './loading-state/loading-state.component';

@NgModule({
  declarations: [
    ToastContainerComponent
  ],
  imports: [
    CommonModule,
    NgbModule,
    TranslateModule,
    FormsModule,
    // Import standalone components
    PageHeaderComponent,
    EmptyStateComponent,
    SearchFilterComponent,
    PageContainerComponent,
    GlassCardComponent,
    LoadingStateComponent
  ],
  exports: [
    ToastContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    SearchFilterComponent,
    PageContainerComponent,
    GlassCardComponent,
    LoadingStateComponent
  ]
})
export class SharedModule { }
