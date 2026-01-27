import { Routes } from '@angular/router';
import { Supplies } from './supplies/supplies';

export const routes: Routes = [
  { path: '', redirectTo: '/supplies', pathMatch: 'full' },
  { path: 'supplies', component: Supplies }
];
