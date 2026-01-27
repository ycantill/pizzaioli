import { Routes } from '@angular/router';
import { Supplies } from './supplies/supplies';
import { Units } from './units/units';
import { DoughCalculator } from './dough-calculator/dough-calculator';
import { Recipes } from './recipes/recipes';
import { Doughs } from './doughs/doughs';

export const routes: Routes = [
  { path: '', redirectTo: '/supplies', pathMatch: 'full' },
  { path: 'supplies', component: Supplies },
  { path: 'units', component: Units },
  { path: 'doughs', component: Doughs },
  { path: 'recipes', component: Recipes },
  { path: 'dough-calculator', component: DoughCalculator }
];
