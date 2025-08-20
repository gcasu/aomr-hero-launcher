import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DataGuideComponent } from './data-guide.component';

const routes: Routes = [
  {
    path: '',
    component: DataGuideComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataGuideRoutingModule { }
