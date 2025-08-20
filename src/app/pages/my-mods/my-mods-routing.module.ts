import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyModsComponent } from './my-mods.component';

const routes: Routes = [
  {
    path: '',
    component: MyModsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyModsRoutingModule { }
