import { Routes } from '@angular/router';
import { Supplies } from './supplies/supplies';
import { Units } from './units/units';

export const routes: Routes = [
  { path: '', redirectTo: '/supplies', pathMatch: 'full' },
  { path: 'supplies', component: Supplies },
  { path: 'units', component: Units }
];
