import { Routes } from '@angular/router';
import { Costs } from './costs/costs';
import { Units } from './units/units';
import { DoughCalculator } from './dough-calculator/dough-calculator';
import { Recipes } from './recipes/recipes';
import { Doughs } from './doughs/doughs';
import { Margins } from './margins/margins';
import { CostTypes } from './cost-types/cost-types';
import { RecipeTypes } from './recipe-types/recipe-types';
import { DeliveryConfig } from './delivery/delivery';
import { Consumptions } from './consumptions/consumptions';

export const routes: Routes = [
  { path: '', redirectTo: '/costs', pathMatch: 'full' },
  { path: 'costs', component: Costs },
  { path: 'cost-types', component: CostTypes },
  { path: 'recipe-types', component: RecipeTypes },
  { path: 'delivery', component: DeliveryConfig },
  { path: 'consumptions', component: Consumptions },
  { path: 'margins', component: Margins },
  { path: 'units', component: Units },
  { path: 'doughs', component: Doughs },
  { path: 'recipes', component: Recipes },
  { path: 'dough-calculator', component: DoughCalculator }
];
