import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { DataGuideRoutingModule } from './data-guide-routing.module';
import { DataGuideComponent } from './data-guide.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TranslateModule,
    DataGuideRoutingModule,
    DataGuideComponent
  ]
})
export class DataGuideModule { }
