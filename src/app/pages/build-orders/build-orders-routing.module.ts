import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BuildOrdersComponent } from './build-orders.component';

const routes: Routes = [
  {
    path: '',
    component: BuildOrdersComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BuildOrdersRoutingModule { }
