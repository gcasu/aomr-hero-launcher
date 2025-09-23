import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ReplayParserRoutingModule } from './replay-parser-routing.module';
import { ReplayParserComponent } from './replay-parser.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ReplayParserRoutingModule,
    ReplayParserComponent
  ]
})
export class ReplayParserModule { }