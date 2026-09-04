import { Injectable, inject } from '@angular/core';
import { batchSizeOf } from '../models/labor.model';
import { Preparation, PreparationConsumption, scaledIngredients } from '../models/preparation.model';
import { Price, preparationsOf } from '../models/price.model';
import { configFor, factorOf } from '../models/size.model';
import { toppingQuantity } from '../models/topping.model';
import { resolveLaborItem } from './labor-rates';
import { RatesDataService } from './rates-data.service';
import { CatalogService } from './catalog.service';
import { ConsumptionsDataService } from './consumptions-data.service';
import { PreparationsDataService } from './preparations-data.service';
import { SizesDataService } from './sizes-data.service';
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

/**
 * Todo lo que define un precio: lo que se prepara aparte, la receta y lo que
 * se le quitó o agregó.
 */
export interface PriceSpec {
  preparations: PreparationConsumption[];
  recipeId: string | null;
  /** El tamaño que se cotiza. Sin tamaño, el base. */
  sizeId: string | null;
  additionToppingIds?: string[];
  removedIngredientIds?: string[];
}

export interface PriceBreakdown {
  preparations: CostLineItem[];
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
  preparations: [], recipe: [], additions: [], packaging: [], labor: [], all: [],
  variableCost: 0, price: 0, contribution: 0, recipeTypeId: null, productionMinutes: 0
};

/**
 * Lo que deja una unidad por cada minuto de cocina que ocupa.
 *
 * El margen por unidad no alcanza para decidir qué empujar en la carta: el
 * horno es el cuello de botella, y un producto que lo ocupa el doble de tiempo
 * rinde la mitad de unidades por hora. Dos platos que dejan lo mismo por
 * unidad no dejan lo mismo por noche.
 *
 * Sin tiempo configurado no hay nada que dividir; se devuelve cero en vez de
 * un infinito que ensuciaría la comparación.
 */
export function contributionPerMinute(breakdown: PriceBreakdown): number {
  if (breakdown.productionMinutes <= 0) return 0;
  return Math.round((breakdown.contribution / breakdown.productionMinutes) * 100) / 100;
}

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
  private preparationsService = inject(PreparationsDataService);
  private sizesService = inject(SizesDataService);
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
      preparations: preparationsOf(price),
      recipeId: price.recipeId ?? null,
      sizeId: price.sizeId ?? null,
      additionToppingIds: price.additionToppingIds,
      removedIngredientIds: price.removedIngredientIds
    };
  }

  breakdownOf(spec: PriceSpec): PriceBreakdown {
    const recipe = spec.recipeId
      ? this.recipesService.recipes().find(r => r.id === spec.recipeId) ?? null
      : null;

    // El tamaño escala los toppings que lo declaran y elige qué empaque y qué
    // mano de obra le tocan: la familiar va en otra caja y ocupa más horno.
    const factor = factorOf(this.sizesService.find(spec.sizeId));

    const preparations = this.preparationLineItems(spec.preparations);
    const recipeItems = this.recipeLineItems(
      recipe?.toppings ?? [], spec.removedIngredientIds, factor
    );
    const additions = this.toppingLineItems(spec.additionToppingIds ?? [], factor);
    const packaging = this.packagingLineItems(recipe?.recipeTypeId, spec.sizeId);
    const labor = this.laborLineItems(recipe?.recipeTypeId, spec.sizeId);

    if (!preparations.length && !recipeItems.length && !additions.length
      && !packaging.length && !labor.length) {
      return { ...EMPTY_BREAKDOWN, recipeTypeId: recipe?.recipeTypeId ?? null };
    }

    const all = [...preparations, ...recipeItems, ...additions, ...packaging, ...labor];
    const variableCost = totalBaseCost(all);
    const price = totalRoundedCost(all);

    return {
      preparations,
      recipe: recipeItems,
      additions,
      packaging,
      labor,
      all,
      variableCost,
      price,
      contribution: Math.round((price - variableCost) * 100) / 100,
      recipeTypeId: recipe?.recipeTypeId ?? null,
      productionMinutes: this.productionMinutes(recipe?.recipeTypeId, spec.sizeId)
    };
  }

  /** Minutos que ocupa una unidad de ese tipo de receta, repartidos por tanda. */
  productionMinutes(recipeTypeId: string | undefined, sizeId: string | null = null): number {
    if (!recipeTypeId) return 0;

    const labor = configFor(this.laborsService.labors(), recipeTypeId, sizeId);
    if (!labor) return 0;

    return labor.items.reduce((sum, item) => sum + item.minutes / batchSizeOf(item), 0);
  }

  /**
   * Lo que cuesta lo que se preparó aparte.
   *
   * Cada preparación se abre en sus ingredientes, escalados por lo que se
   * consume: así el precio muestra la harina y el agua de verdad, cada una con
   * su propio margen, y no un bloque opaco llamado "masa".
   */
  private preparationLineItems(consumptions: PreparationConsumption[]): CostLineItem[] {
    return consumptions.flatMap(consumption => {
      const preparation = this.preparationsService.find(consumption.preparationId);
      if (!preparation) return [];

      return this.ingredientLineItems(preparation, consumption.quantity);
    });
  }

  private ingredientLineItems(preparation: Preparation, quantity: number): CostLineItem[] {
    return scaledIngredients(preparation, quantity).map(ingredient => {
      const item = this.catalog.find(ingredient.supplyId);
      if (!item) return null;

      return buildLineItem(item, ingredient.quantity, {
        name: `${item.name} (${preparation.name})`
      });
    }).filter((item): item is CostLineItem => item !== null);
  }

  private recipeLineItems(
    toppingIds: string[],
    removedIds: string[] | undefined,
    factor: number
  ): CostLineItem[] {
    const removed = new Set(removedIds ?? []);
    return this.toppingLineItems(toppingIds.filter(id => !removed.has(id)), factor);
  }

  /**
   * Cada línea arrastra el id de su topping: quitarla desde la tabla busca por
   * ese id y no por la posición, que se corre si algún topping ya no existe.
   */
  private toppingLineItems(toppingIds: string[], factor: number): CostLineItem[] {
    const allToppings = this.toppingsService.toppings();

    return toppingIds.map(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (!topping) return null;

      const item = this.catalog.find(topping.supplyId);
      if (!item) return null;

      return buildLineItem(item, toppingQuantity(topping, factor), {
        name: `${item.name} (${topping.size})`,
        toppingId
      });
    }).filter((item): item is CostLineItem => item !== null);
  }

  private packagingLineItems(
    recipeTypeId: string | undefined,
    sizeId: string | null
  ): CostLineItem[] {
    if (!recipeTypeId) return [];

    const packaging = configFor(this.packagingsService.packagings(), recipeTypeId, sizeId);
    if (!packaging) return [];

    return packaging.items.map(packagingItem => {
      const item = this.catalog.find(packagingItem.supplyId);
      if (!item) return null;

      return buildLineItem(item, packagingItem.quantity);
    }).filter((item): item is CostLineItem => item !== null);
  }

  private laborLineItems(recipeTypeId: string | undefined, sizeId: string | null): LaborLineItem[] {
    if (!recipeTypeId) return [];

    const labor = configFor(this.laborsService.labors(), recipeTypeId, sizeId);
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
