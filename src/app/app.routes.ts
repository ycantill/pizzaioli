import { Routes } from '@angular/router';
import { Costs } from './costs/costs';
import { Units } from './units/units';
import { DoughCalculator } from './dough-calculator/dough-calculator';
import { Recipes } from './recipes/recipes';
import { Doughs } from './doughs/doughs';
import { Margins } from './margins/margins';
import { Prices } from './prices/prices';
import { CostTypes } from './cost-types/cost-types';

export const routes: Routes = [
  { path: '', redirectTo: '/costs', pathMatch: 'full' },
  { path: 'costs', component: Costs },
  { path: 'cost-types', component: CostTypes },
  { path: 'margins', component: Margins },
  { path: 'units', component: Units },
  { path: 'doughs', component: Doughs },
  { path: 'recipes', component: Recipes },
  { path: 'prices', component: Prices },
  { path: 'dough-calculator', component: DoughCalculator }
];
