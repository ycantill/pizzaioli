import { Injectable, computed, inject } from '@angular/core';
import { CostTypeKind } from '../models/cost-type.model';
import { MarginConfig } from '../models/margin-config.model';
import { PricedItem } from '../models/priced-item.model';
import { Rate } from '../models/rate.model';
import { Supply } from '../models/supply.model';
import { CostTypesDataService } from './cost-types-data.service';
import { RatesDataService } from './rates-data.service';
import { SuppliesDataService } from './supplies-data.service';

/**
 * Vista unificada del catálogo: insumos y tarifas proyectados a PricedItem.
 *
 * Reemplaza el par CostsDataService + MarginsDataService que antes había que
 * consultar por separado para cada línea de costo.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private suppliesService = inject(SuppliesDataService);
  private ratesService = inject(RatesDataService);
  private costTypesService = inject(CostTypesDataService);

  readonly isLoading = computed(() =>
    this.suppliesService.isLoading() || this.ratesService.isLoading()
  );

  readonly items = computed<PricedItem[]>(() => [
    ...this.suppliesService.supplies().filter(s => s.id).map(supplyToPricedItem),
    ...this.ratesService.rates().filter(r => r.id).map(rateToPricedItem)
  ]);

  /** Índice por id: antes cada línea de costo hacía un find() sobre todo el catálogo. */
  readonly itemsById = computed(() => new Map(this.items().map(item => [item.id, item])));

  /** Solo lo inventariable. */
  readonly supplyItems = computed(() =>
    this.suppliesService.supplies().filter(s => s.id).map(supplyToPricedItem)
  );

  /** Solo servicios y mano de obra. */
  readonly rateItems = computed(() =>
    this.ratesService.rates().filter(r => r.id).map(rateToPricedItem)
  );

  /** Categorías agrupadas por función, resolviendo las que aún no la declaran. */
  private readonly categoryKinds = computed(() => {
    const kinds = new Map<string, CostTypeKind>();

    for (const category of this.costTypesService.costTypes()) {
      if (!category.id) continue;
      const kind = category.kind ?? inferCostTypeKind(category.name);
      if (kind) kinds.set(category.id, kind);
    }

    return kinds;
  });

  /**
   * Categorías que sirven para clasificar un insumo.
   *
   * Deja fuera las que quedaron de cuando esta colección también clasificaba
   * servicios y mano de obra: esos pasaron a ser tarifas y no llevan
   * categoría. Un insumo con una de esas categorías no caería ni en
   * ingredientes ni en paquetería y desaparecería de los dos selectores.
   */
  readonly supplyCategories = computed(() =>
    this.costTypesService.costTypes().filter(category =>
      category.id !== undefined && this.categoryKinds().has(category.id)
    )
  );

  readonly ingredients = computed(() => this.suppliesOfKind('ingrediente'));

  readonly packagingSupplies = computed(() => this.suppliesOfKind('paqueteria'));

  private suppliesOfKind(kind: CostTypeKind): PricedItem[] {
    const kinds = this.categoryKinds();
    // Sin ninguna categoría clasificada no se puede filtrar: se ofrece todo.
    if (kinds.size === 0) return this.supplyItems();

    return this.suppliesFor(supply => kinds.get(supply.categoryId) === kind);
  }

  private suppliesFor(predicate: (supply: Supply) => boolean): PricedItem[] {
    return this.suppliesService.supplies()
      .filter(supply => supply.id && predicate(supply))
      .map(supplyToPricedItem);
  }

  find(id: string | undefined): PricedItem | undefined {
    return id ? this.itemsById().get(id) : undefined;
  }

  name(id: string | undefined, fallback = 'Desconocido'): string {
    return this.find(id)?.name ?? fallback;
  }

  /** Un id del catálogo es de un insumo o de una tarifa, nunca de ambos. */
  kindOf(id: string): 'supply' | 'rate' | undefined {
    if (this.suppliesService.supplies().some(s => s.id === id)) return 'supply';
    if (this.ratesService.rates().some(r => r.id === id)) return 'rate';
    return undefined;
  }

  /**
   * Guarda el margen en el documento que lo contiene. Reemplaza a la antigua
   * colección `margins`: ya no hay forma de que un margen quede huérfano.
   */
  async updateMargin(id: string, margin: MarginConfig): Promise<void> {
    const supply = this.suppliesService.supplies().find(s => s.id === id);
    if (supply) {
      await this.suppliesService.update(id, { ...supply, margin });
      return;
    }

    const rate = this.ratesService.rates().find(r => r.id === id);
    if (rate) {
      await this.ratesService.update(id, { ...rate, margin });
      return;
    }

    throw new Error(`No existe insumo ni tarifa con id ${id}.`);
  }
}

/**
 * Deduce la función de una categoría por su nombre, para los datos anteriores
 * al campo `kind`. Es el último resto de la clasificación por texto y se puede
 * borrar en cuanto todas las categorías estén clasificadas a mano.
 */
export function inferCostTypeKind(name: string): CostTypeKind | undefined {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('ingrediente')) return 'ingrediente';
  if (normalized.includes('paquet') || normalized.includes('empaque')) return 'paqueteria';
  return undefined;
}

export function supplyToPricedItem(supply: Supply): PricedItem {
  return {
    id: supply.id!,
    name: supply.name,
    unitId: supply.unitId,
    unitCost: supply.unitCost,
    margin: supply.margin
  };
}

export function rateToPricedItem(rate: Rate): PricedItem {
  return {
    id: rate.id!,
    name: rate.name,
    unitId: rate.unitId,
    unitCost: rate.value,
    margin: rate.margin
  };
}
