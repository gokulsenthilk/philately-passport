import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage), title: 'Philately Passport (unofficial)' },
  { path: 'map', loadComponent: () => import('./features/map/map.page').then((m) => m.MapPage), title: 'Map · Philately Passport' },
  { path: 'passport', redirectTo: 'passport/KA', pathMatch: 'full' },
  { path: 'passport/:code', loadComponent: () => import('./features/passport/passport.page').then((m) => m.PassportPage), title: 'Passport pages' },
  { path: 'location/:id', loadComponent: () => import('./features/location/location.page').then((m) => m.LocationPage), title: 'Stamp location' },
  { path: 'nearby', loadComponent: () => import('./features/nearby/nearby.page').then((m) => m.NearbyPage), title: 'Near me' },
  { path: 'progress', loadComponent: () => import('./features/progress/progress.page').then((m) => m.ProgressPage), title: 'Progress' },
  { path: 'guide', loadComponent: () => import('./features/guide/guide.page').then((m) => m.GuidePage), title: 'How it works' },
  { path: '**', redirectTo: '' },
];
