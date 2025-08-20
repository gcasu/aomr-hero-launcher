import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { TiersRoutingModule } from './tiers-routing.module';
import { TiersComponent } from './tiers.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    TranslateModule,
    TiersRoutingModule,
    TiersComponent
  ]
})
export class TiersModule { }
