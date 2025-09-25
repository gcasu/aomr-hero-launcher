import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReplayParserComponent } from './replay-parser.component';

const routes: Routes = [
  {
    path: '',
    component: ReplayParserComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReplayParserRoutingModule { }