import { Routes } from '@angular/router';
import { Units } from './units/units';
import { DoughCalculator } from './dough-calculator/dough-calculator';
import { Recipes } from './recipes/recipes';
import { Doughs } from './doughs/doughs';
import { Margins } from './margins/margins';
import { CostTypes } from './cost-types/cost-types';
import { RecipeTypes } from './recipe-types/recipe-types';
import { PackagingConfig } from './packaging/packaging';
import { Consumptions } from './consumptions/consumptions';
import { Prices } from './prices/prices';
import { LaborConfig } from './labor/labor';
import { Toppings } from './toppings/toppings';
import { Login } from './auth/login/login';
import { authGuard, noAuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [noAuthGuard] },
  { path: 'order', loadComponent: () => import('./order/order').then((m) => m.Order) },
  { path: '', redirectTo: '/inventario', pathMatch: 'full' },
  { path: 'cost-types', component: CostTypes, canActivate: [authGuard] },
  { path: 'recipe-types', component: RecipeTypes, canActivate: [authGuard] },
  { path: 'packaging', component: PackagingConfig, canActivate: [authGuard] },
  { path: 'consumptions', component: Consumptions, canActivate: [authGuard] },
  { path: 'margins', component: Margins, canActivate: [authGuard] },
  { path: 'units', component: Units, canActivate: [authGuard] },
  { path: 'doughs', component: Doughs, canActivate: [authGuard] },
  { path: 'recipes', component: Recipes, canActivate: [authGuard] },
  { path: 'dough-calculator', component: DoughCalculator, canActivate: [authGuard] },
  { path: 'prices', component: Prices, canActivate: [authGuard] },
  { path: 'labor', component: LaborConfig, canActivate: [authGuard] },
  { path: 'toppings', component: Toppings, canActivate: [authGuard] },
  {
    path: 'inventario',
    loadComponent: () => import('./inventory/inventory').then((m) => m.Inventory),
    canActivate: [authGuard]
  },
  {
    path: 'mantenimiento',
    loadComponent: () => import('./maintenance/maintenance').then((m) => m.Maintenance),
    canActivate: [authGuard]
  },
  {
    path: 'tarifas',
    loadComponent: () => import('./rates/rates').then((m) => m.Rates),
    canActivate: [authGuard]
  },
];
