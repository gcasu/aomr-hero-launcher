import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { BuildOrdersRoutingModule } from './build-orders-routing.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    BuildOrdersRoutingModule
  ]
})
export class BuildOrdersModule { }
