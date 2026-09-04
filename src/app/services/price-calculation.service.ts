import { Injectable, inject } from '@angular/core';
import { batchSizeOf } from '../models/labor.model';
import { Price } from '../models/price.model';
import { resolveLaborItem } from './labor-rates';
import { RatesDataService } from './rates-data.service';
import { CatalogService } from './catalog.service';
import { ConsumptionsDataService } from './consumptions-data.service';
import { DoughCalculationService } from './dough-calculation.service';
import { DoughsDataService } from './doughs-data.service';
import { LaborsDataService } from './labors-data.service';
import { PackagingsDataService } from './packagings-data.service';
import { RecipesDataService } from './recipes-data.service';
import { ToppingsDataService } from './toppings-data.service';
import {
  buildLaborLineItem,
  buildLineItem,
  CostLineItem,
  LaborLineItem,
  totalBaseCost,
  totalRoundedCost
} from './pricing';

/** Todo lo que define un precio: una masa, una receta y lo que se le quitó o agregó. */
export interface PriceSpec {
  doughId: string | null;
  recipeId: string | null;
  ballWeight: number;
  additionToppingIds?: string[];
  removedIngredientIds?: string[];
}

export interface PriceBreakdown {
  dough: CostLineItem[];
  recipe: CostLineItem[];
  additions: CostLineItem[];
  packaging: CostLineItem[];
  labor: LaborLineItem[];
  all: (CostLineItem | LaborLineItem)[];
  /** Lo que cuesta producir una unidad: insumos, empaque y servicios. */
  variableCost: number;
  price: number;
  /**
   * Lo que deja cada unidad vendida una vez pagado lo que costó producirla.
   * Es de aquí de donde salen los costos fijos, no del precio de cada pizza.
   */
  contribution: number;
  recipeTypeId: string | null;
  /** Minutos de cocina que ocupa una unidad, ya repartidos por tanda. */
  productionMinutes: number;
}

const EMPTY_BREAKDOWN: PriceBreakdown = {
  dough: [], recipe: [], additions: [], packaging: [], labor: [], all: [],
  variableCost: 0, price: 0, contribution: 0, recipeTypeId: null, productionMinutes: 0
};

/**
 * Arma el desglose de costo de una unidad.
 *
 * Vivía dentro de la pantalla de precios, donde nadie más podía usarlo. El
 * punto de equilibrio necesita el costo variable de cada precio guardado para
 * saber cuánto deja cada venta, así que el cálculo tuvo que salir de la
 * pantalla y quedar donde ambas lo alcanzan.
 */
@Injectable({ providedIn: 'root' })
export class PriceCalculationService {
  private doughCalcService = inject(DoughCalculationService);
  private doughsService = inject(DoughsDataService);
  private recipesService = inject(RecipesDataService);
  private catalog = inject(CatalogService);
  private packagingsService = inject(PackagingsDataService);
  private consumptionsService = inject(ConsumptionsDataService);
  private laborsService = inject(LaborsDataService);
  private ratesService = inject(RatesDataService);
  private toppingsService = inject(ToppingsDataService);

  /** Un precio guardado vuelve a ser la receta que lo produjo. */
  specOf(price: Price): PriceSpec {
    return {
      doughId: price.doughId ?? null,
      recipeId: price.recipeId ?? null,
      ballWeight: price.ballWeight ?? 0,
      additionToppingIds: price.additionToppingIds,
      removedIngredientIds: price.removedIngredientIds
    };
  }

  breakdownOf(spec: PriceSpec): PriceBreakdown {
    const recipe = spec.recipeId
      ? this.recipesService.recipes().find(r => r.id === spec.recipeId) ?? null
      : null;

    const dough = this.doughLineItems(spec);
    const recipeItems = this.recipeLineItems(recipe?.toppings ?? [], spec.removedIngredientIds);
    const additions = this.toppingLineItems(spec.additionToppingIds ?? []);
    const packaging = this.packagingLineItems(recipe?.recipeTypeId);
    const labor = this.laborLineItems(recipe?.recipeTypeId);

    if (!dough.length && !recipeItems.length && !additions.length
      && !packaging.length && !labor.length) {
      return { ...EMPTY_BREAKDOWN, recipeTypeId: recipe?.recipeTypeId ?? null };
    }

    const all = [...dough, ...recipeItems, ...additions, ...packaging, ...labor];
    const variableCost = totalBaseCost(all);
    const price = totalRoundedCost(all);

    return {
      dough,
      recipe: recipeItems,
      additions,
      packaging,
      labor,
      all,
      variableCost,
      price,
      contribution: Math.round((price - variableCost) * 100) / 100,
      recipeTypeId: recipe?.recipeTypeId ?? null,
      productionMinutes: this.productionMinutes(recipe?.recipeTypeId)
    };
  }

  /** Minutos que ocupa una unidad de ese tipo de receta, repartidos por tanda. */
  productionMinutes(recipeTypeId: string | undefined): number {
    if (!recipeTypeId) return 0;

    const labor = this.laborsService.labors().find(l => l.recipeTypeId === recipeTypeId);
    if (!labor) return 0;

    return labor.items.reduce((sum, item) => sum + item.minutes / batchSizeOf(item), 0);
  }

  private doughLineItems(spec: PriceSpec): CostLineItem[] {
    const dough = spec.doughId
      ? this.doughsService.doughs().find(d => d.id === spec.doughId)
      : undefined;
    if (!dough) return [];

    const bakerPercentages = this.doughCalcService.getDoughBakerPercentages(
      dough, this.catalog.items()
    );
    if (bakerPercentages.length === 0) return [];

    const totalBakerPercentage = bakerPercentages.reduce((sum, bp) => sum + bp.bakerPercentage, 0);
    if (totalBakerPercentage === 0) return [];

    const ingredientMultiplier = spec.ballWeight / totalBakerPercentage;

    return bakerPercentages.map(bp => {
      const item = this.catalog.find(bp.supplyId);
      if (!item) return null;

      return buildLineItem(item, ingredientMultiplier * bp.bakerPercentage);
    }).filter((item): item is CostLineItem => item !== null);
  }

  private recipeLineItems(toppingIds: string[], removedIds: string[] | undefined): CostLineItem[] {
    const removed = new Set(removedIds ?? []);
    return this.toppingLineItems(toppingIds.filter(id => !removed.has(id)));
  }

  /**
   * Cada línea arrastra el id de su topping: quitarla desde la tabla busca por
   * ese id y no por la posición, que se corre si algún topping ya no existe.
   */
  private toppingLineItems(toppingIds: string[]): CostLineItem[] {
    const allToppings = this.toppingsService.toppings();

    return toppingIds.map(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (!topping) return null;

      const item = this.catalog.find(topping.supplyId);
      if (!item) return null;

      return buildLineItem(item, topping.quantity, {
        name: `${item.name} (${topping.size})`,
        toppingId
      });
    }).filter((item): item is CostLineItem => item !== null);
  }

  private packagingLineItems(recipeTypeId: string | undefined): CostLineItem[] {
    if (!recipeTypeId) return [];

    const packaging = this.packagingsService.packagings()
      .find(p => p.recipeTypeId === recipeTypeId);
    if (!packaging) return [];

    return packaging.items.map(packagingItem => {
      const item = this.catalog.find(packagingItem.supplyId);
      if (!item) return null;

      return buildLineItem(item, packagingItem.quantity);
    }).filter((item): item is CostLineItem => item !== null);
  }

  private laborLineItems(recipeTypeId: string | undefined): LaborLineItem[] {
    if (!recipeTypeId) return [];

    const labor = this.laborsService.labors().find(l => l.recipeTypeId === recipeTypeId);
    if (!labor) return [];

    const rates = this.ratesService.rates();
    const legacyConsumptions = this.consumptionsService.consumptions();

    return labor.items.map(laborItem => {
      const resolved = resolveLaborItem(laborItem, rates, legacyConsumptions);
      if (!resolved) return null;

      const item = this.catalog.find(resolved.rateId);
      if (!item) return null;

      return buildLaborLineItem(
        resolved.name, item, resolved.quantityPerHour, resolved.minutes, resolved.batchSize
      );
    }).filter((item): item is LaborLineItem => item !== null);
  }
}
