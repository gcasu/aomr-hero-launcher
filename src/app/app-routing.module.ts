import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'my-mods',
    loadChildren: () => import('./pages/my-mods/my-mods.module').then(m => m.MyModsModule)
  },
  {
    path: 'resources',
    loadChildren: () => import('./pages/resources/resources.module').then(m => m.ResourcesModule)
  },
  {
    path: 'data-guide',
    loadChildren: () => import('./pages/data-guide/data-guide.module').then(m => m.DataGuideModule)
  },
  {
    path: 'leaderboard',
    loadChildren: () => import('./pages/leaderboard/leaderboard.module').then(m => m.LeaderboardModule)
  },
  {
    path: 'build-orders',
    loadChildren: () => import('./pages/build-orders/build-orders.module').then(m => m.BuildOrdersModule)
  },
  {
    path: 'tiers',
    loadChildren: () => import('./pages/tiers/tiers.module').then(m => m.TiersModule)
  },
  {
    path: 'youtube-feed',
    loadChildren: () => import('./pages/youtube-feed/youtube-feed.module').then(m => m.YouTubeFeedModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsModule)
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
