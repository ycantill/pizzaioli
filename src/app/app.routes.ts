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
import { Prices } from './prices/prices';
import { LaborConfig } from './labor/labor';
import { Login } from './auth/login/login';
import { authGuard, noAuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [noAuthGuard] },
  { path: '', redirectTo: '/costs', pathMatch: 'full' },
  { path: 'costs', component: Costs, canActivate: [authGuard] },
  { path: 'cost-types', component: CostTypes, canActivate: [authGuard] },
  { path: 'recipe-types', component: RecipeTypes, canActivate: [authGuard] },
  { path: 'delivery', component: DeliveryConfig, canActivate: [authGuard] },
  { path: 'consumptions', component: Consumptions, canActivate: [authGuard] },
  { path: 'margins', component: Margins, canActivate: [authGuard] },
  { path: 'units', component: Units, canActivate: [authGuard] },
  { path: 'doughs', component: Doughs, canActivate: [authGuard] },
  { path: 'recipes', component: Recipes, canActivate: [authGuard] },
  { path: 'dough-calculator', component: DoughCalculator, canActivate: [authGuard] },
  { path: 'prices', component: Prices, canActivate: [authGuard] },
  { path: 'labor', component: LaborConfig, canActivate: [authGuard] },
];
