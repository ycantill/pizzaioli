import { Routes } from '@angular/router';
import { Costs } from './costs/costs';
import { Units } from './units/units';
import { DoughCalculator } from './dough-calculator/dough-calculator';
import { Recipes } from './recipes/recipes';
import { Doughs } from './doughs/doughs';
import { Margins } from './margins/margins';

export const routes: Routes = [
  { path: '', redirectTo: '/costs', pathMatch: 'full' },
  { path: 'costs', component: Costs },
  { path: 'margins', component: Margins },
  { path: 'units', component: Units },
  { path: 'doughs', component: Doughs },
  { path: 'recipes', component: Recipes },
  { path: 'dough-calculator', component: DoughCalculator }
];
