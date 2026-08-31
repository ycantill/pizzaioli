import { Component, signal, computed, inject, ChangeDetectionStrategy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Price } from '../models/price.model';
import { DoughCalculationService } from '../services/dough-calculation.service';
import { DoughsDataService } from '../services/doughs-data.service';
import { RecipesDataService } from '../services/recipes-data.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { CatalogService } from '../services/catalog.service';
import { UnitsDataService } from '../services/units-data.service';
import { PackagingsDataService } from '../services/packagings-data.service';
import { ConsumptionsDataService } from '../services/consumptions-data.service';
import { LaborsDataService } from '../services/labors-data.service';
import { PricesDataService } from '../services/prices-data.service';
import { ToppingsDataService } from '../services/toppings-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import {
  buildLaborLineItem,
  buildLineItem,
  CostLineItem,
  excludingRecovery,
  LaborLineItem,
  subtotal,
  totalBaseCost,
  totalCostWithMargin,
  totalRoundedCost
} from '../services/pricing';

@Component({
  selector: 'app-prices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DecimalPipe
  ],
  templateUrl: './prices.html',
  styleUrl: './prices.css'
})
export class Prices {
  private doughCalcService = inject(DoughCalculationService);
  private dialog = inject(MatDialog);
  private doughsService = inject(DoughsDataService);
  private recipesService = inject(RecipesDataService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private catalog = inject(CatalogService);
  private unitsService = inject(UnitsDataService);
  private packagingsService = inject(PackagingsDataService);
  private consumptionsService = inject(ConsumptionsDataService);
  private laborsService = inject(LaborsDataService);
  private pricesService = inject(PricesDataService);
  private toppingsService = inject(ToppingsDataService);

  doughs = this.doughsService.doughs;
  recipes = this.recipesService.recipes;
  recipeTypes = this.recipeTypesService.recipeTypes;
  packagings = this.packagingsService.packagings;
  consumptions = this.consumptionsService.consumptions;
  labors = this.laborsService.labors;
  toppings = this.toppingsService.toppings;
  savedPrices = this.pricesService.prices;
  sortedSavedPrices = computed(() => [...this.savedPrices()].sort((a, b) => a.price - b.price));

  selectedDoughId = signal<string | null>(null);
  selectedRecipeId = signal<string | null>(null);
  ballWeight = signal(250);
  priceName = signal('');
  selectedAdditionIds = signal<string[]>([]);
  removedIngredientIds = signal<string[]>([]);
  pendingAdditionId = signal<string | null>(null);

  loading = computed(() =>
    this.doughsService.isLoading() || this.recipesService.isLoading() ||
    this.recipeTypesService.isLoading() || this.catalog.isLoading() ||
    this.unitsService.isLoading() ||
    this.packagingsService.isLoading() || this.consumptionsService.isLoading() ||
    this.laborsService.isLoading() || this.pricesService.isLoading() ||
    this.toppingsService.isLoading()
  );
  saving = signal(false);

  ingredientColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin', 'roundedCost'];
  recipeIngredientColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin', 'roundedCost', 'remove'];
  additionColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin', 'roundedCost', 'remove'];
  laborColumns: string[] = ['name', 'costPerHour', 'hours', 'baseCost', 'margin', 'costWithMargin', 'roundedCost'];
  savedPricesColumns: string[] = ['name', 'ingredients', 'price', 'actions'];

  constructor() {
    effect(() => {
      const doughId = this.selectedDoughId();
      if (doughId) {
        const dough = this.doughs().find(d => d.id === doughId);
        if (dough) this.ballWeight.set(dough.ballWeight);
      }
    });
  }

  selectedDough = computed(() => {
    const id = this.selectedDoughId();
    return id ? this.doughs().find(d => d.id === id) ?? null : null;
  });

  selectedRecipe = computed(() => {
    const id = this.selectedRecipeId();
    return id ? this.recipes().find(r => r.id === id) ?? null : null;
  });

  selectedRecipeTypeName = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.recipeTypes().find(rt => rt.id === recipe.recipeTypeId)?.name ?? null;
  });

  doughLineItems = computed<CostLineItem[]>(() => {
    const dough = this.selectedDough();
    if (!dough) return [];

    const weight = this.ballWeight();
    const bakerPercentages = this.doughCalcService.getDoughBakerPercentages(dough, this.catalog.items());
    if (bakerPercentages.length === 0) return [];

    const totalBakerPercentage = bakerPercentages.reduce((sum, bp) => sum + bp.bakerPercentage, 0);
    if (totalBakerPercentage === 0) return [];

    const ingredientMultiplier = weight / totalBakerPercentage;

    return bakerPercentages.map(bp => {
      const item = this.catalog.find(bp.supplyId);
      if (!item) return null;

      return buildLineItem(item, ingredientMultiplier * bp.bakerPercentage);
    }).filter((item): item is CostLineItem => item !== null);
  });

  recipeLineItems = computed<CostLineItem[]>(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return [];

    const allToppings = this.toppings();
    const removed = new Set(this.removedIngredientIds());

    return recipe.toppings.filter(id => !removed.has(id)).map(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (!topping) return null;

      const item = this.catalog.find(topping.supplyId);
      if (!item) return null;

      return buildLineItem(item, topping.quantity, {
        name: `${item.name} (${topping.size})`,
        toppingId
      });
    }).filter((item): item is CostLineItem => item !== null);
  });

  availableSizeSAdditions = computed(() => {
    const recipeToppingIds = new Set(this.selectedRecipe()?.toppings ?? []);
    const alreadyAdded = new Set(this.selectedAdditionIds());
    const sizeOrder: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3, XXL: 4 };
    return this.toppings()
      .filter(t => !recipeToppingIds.has(t.id!) && !alreadyAdded.has(t.id!))
      .sort((a, b) => {
        const nameA = this.catalog.name(a.supplyId, '');
        const nameB = this.catalog.name(b.supplyId, '');
        const nameCmp = nameA.localeCompare(nameB);
        return nameCmp !== 0 ? nameCmp : (sizeOrder[a.size] ?? 99) - (sizeOrder[b.size] ?? 99);
      });
  });

  additionLineItems = computed<CostLineItem[]>(() => {
    const allToppings = this.toppings();

    return this.selectedAdditionIds().map(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (!topping) return null;

      const item = this.catalog.find(topping.supplyId);
      if (!item) return null;

      return buildLineItem(item, topping.quantity, {
        name: `${item.name} (${topping.size})`
      });
    }).filter((item): item is CostLineItem => item !== null);
  });

  additionSubtotal = computed(() => subtotal(this.additionLineItems()));

  matchedPackaging = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.packagings().find(d => d.recipeTypeId === recipe.recipeTypeId) ?? null;
  });

  packagingLineItems = computed<CostLineItem[]>(() => {
    const packaging = this.matchedPackaging();
    if (!packaging) return [];

    return packaging.items.map(packagingItem => {
      const item = this.catalog.find(packagingItem.supplyId);
      if (!item) return null;

      return buildLineItem(item, packagingItem.quantity);
    }).filter((item): item is CostLineItem => item !== null);
  });

  matchedLabor = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.labors().find(l => l.recipeTypeId === recipe.recipeTypeId) ?? null;
  });

  laborLineItems = computed<LaborLineItem[]>(() => {
    const labor = this.matchedLabor();
    if (!labor) return [];

    const allConsumptions = this.consumptions();

    return labor.items.map(laborItem => {
      const consumption = allConsumptions.find(c => c.id === laborItem.consumptionId);
      if (!consumption) return null;

      const item = this.catalog.find(consumption.rateId);
      if (!item) return null;

      return buildLaborLineItem(consumption.name, item, consumption.quantity, laborItem.minutes);
    }).filter((item): item is LaborLineItem => item !== null);
  });

  doughSubtotal = computed(() => subtotal(this.doughLineItems()));

  recipeSubtotal = computed(() => subtotal(this.recipeLineItems()));

  packagingSubtotal = computed(() => subtotal(this.packagingLineItems()));

  laborSubtotal = computed(() => subtotal(this.laborLineItems()));

  /** Todas las líneas que componen un precio: ingredientes, adiciones, empaque y mano de obra. */
  allLineItems = computed<(CostLineItem | LaborLineItem)[]>(() => [
    ...this.doughLineItems(),
    ...this.recipeLineItems(),
    ...this.additionLineItems(),
    ...this.packagingLineItems(),
    ...this.laborLineItems()
  ]);

  totalBaseCost = computed(() => totalBaseCost(this.allLineItems()));

  totalWithMargin = computed(() => totalRoundedCost(this.allLineItems()));

  totalMarginAmount = computed(() =>
    Math.round((this.suggestedPrice() - this.totalBaseCost()) * 100) / 100
  );

  profitLineItems = computed(() => excludingRecovery(this.allLineItems()));

  totalBaseCostExcludingRecovery = computed(() => totalBaseCost(this.profitLineItems()));

  totalWithMarginProfitOnly = computed(() => totalCostWithMargin(this.profitLineItems()));

  totalWithMarginPercent = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    if (base === 0) return 0;
    return Math.round(((this.totalWithMarginProfitOnly() - base) / base) * 10000) / 100;
  });

  averageWeightedMargin = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    if (base === 0) return 0;
    return Math.round((this.totalWithMarginProfitOnly() / base) * 10000) / 100;
  });

  totalRecoveryWithMargin = computed(() =>
    Math.round((this.totalWithMargin() - this.totalWithMarginProfitOnly()) * 100) / 100
  );

  totalProfitAndReinvestmentAmount = computed(() =>
    Math.round((this.totalWithMarginProfitOnly() - this.totalBaseCostExcludingRecovery()) * 100) / 100
  );

  totalMarginPercent = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    if (base === 0) return 0;
    return Math.round((this.totalMarginAmount() / base) * 10000) / 100;
  });

  suggestedPrice = computed(() => {
    const total = this.totalWithMargin();
    return total <= 0 ? 0 : total;
  });

  canSave = computed(() =>
    this.priceName().trim().length > 0 && this.suggestedPrice() > 0 && !this.saving()
  );

  onDoughSelected(doughId: string | null) {
    this.selectedDoughId.set(doughId);
  }

  onRecipeSelected(recipeId: string | null) {
    this.selectedRecipeId.set(recipeId);
    this.selectedAdditionIds.set([]);
    this.removedIngredientIds.set([]);
    this.pendingAdditionId.set(null);
    const recipe = recipeId ? this.recipes().find(r => r.id === recipeId) ?? null : null;
    if (recipe) {
      const typeName = this.recipeTypes().find(rt => rt.id === recipe.recipeTypeId)?.name ?? '';
      this.priceName.set(typeName ? `${typeName} - ${recipe.name}` : recipe.name);
    } else {
      this.priceName.set('');
    }
  }

  getToppingDisplayLabel(toppingId: string): string {
    const topping = this.toppings().find(t => t.id === toppingId);
    if (!topping) return 'Desconocido';
    return `${this.catalog.name(topping.supplyId)} — ${topping.size} (${topping.quantity}g)`;
  }

  addAddition() {
    const id = this.pendingAdditionId();
    if (!id) return;
    this.selectedAdditionIds.update(ids => [...ids, id]);
    this.pendingAdditionId.set(null);
  }

  removeAddition(toppingId: string) {
    this.selectedAdditionIds.update(ids => ids.filter(id => id !== toppingId));
  }

  removeIngredient(toppingId: string) {
    this.removedIngredientIds.update(ids => [...ids, toppingId]);
  }

  formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  }

  getRecipeIngredientNames(price: Price): string {
    const recipe = price.recipeId ? this.recipes().find(r => r.id === price.recipeId) : null;
    if (!recipe) return '';
    const removed = new Set(price.removedIngredientIds ?? []);
    const toppingIds = [
      ...recipe.toppings.filter(id => !removed.has(id)),
      ...(price.additionToppingIds ?? [])
    ];
    const allToppings = this.toppings();
    const seen = new Set<string>();
    return toppingIds
      .map(id => {
        const topping = allToppings.find(t => t.id === id);
        if (!topping) return null;
        const name = this.catalog.find(topping.supplyId)?.name ?? null;
        if (!name || seen.has(name)) return null;
        seen.add(name);
        return name;
      })
      .filter((n): n is string => n !== null)
      .join(', ');
  }

  async savePrice() {
    if (!this.canSave()) return;

    this.saving.set(true);
    try {
      const priceData: Price = {
        name: this.priceName().trim(),
        price: this.suggestedPrice(),
        doughId: this.selectedDoughId(),
        recipeId: this.selectedRecipeId(),
        ballWeight: this.ballWeight(),
        ...(this.selectedAdditionIds().length ? { additionToppingIds: this.selectedAdditionIds() } : {}),
        ...(this.removedIngredientIds().length ? { removedIngredientIds: this.removedIngredientIds() } : {}),
      };
      await this.pricesService.add(priceData);
      this.priceName.set('');
    } catch (error) {
      console.error('Error saving price:', error);
    } finally {
      this.saving.set(false);
    }
  }

  loadPrice(price: Price): void {
    this.selectedDoughId.set(price.doughId ?? null);
    this.selectedRecipeId.set(price.recipeId ?? null);
    this.ballWeight.set(price.ballWeight ?? 250);
    this.priceName.set(price.name);
    this.selectedAdditionIds.set(price.additionToppingIds ?? []);
    this.removedIngredientIds.set(price.removedIngredientIds ?? []);
    this.pendingAdditionId.set(null);
  }

  deletePrice(price: Price) {
    if (!price.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminacion',
        message: `¿Estas seguro de que deseas eliminar el precio "${price.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.pricesService.remove(price.id!);
        } catch (error) {
          console.error('Error deleting price:', error);
        }
      }
    });
  }
}
