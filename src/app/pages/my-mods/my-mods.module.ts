import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { MyModsRoutingModule } from './my-mods-routing.module';
import { MyModsComponent } from './my-mods.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    TranslateModule,
    NgbModule,
    MyModsRoutingModule,
    MyModsComponent
  ]
})
export class MyModsModule { }
