import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FixedCost, totalMonthlyFixedCost } from '../models/fixed-cost.model';
import { FixedCostsDataService } from '../services/fixed-costs-data.service';
import { PricesDataService } from '../services/prices-data.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { PriceCalculationService } from '../services/price-calculation.service';
import { PricingSettingsDataService } from '../services/pricing-settings-data.service';
import { breakEven, ProductContribution } from '../services/break-even';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';
import { FixedCostDialog, FixedCostDialogResult } from './fixed-cost-dialog';
import { OperatingDaysDialog } from './operating-days-dialog';

@Component({
  selector: 'app-fixed-costs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './fixed-costs.html',
  styleUrl: './fixed-costs.css'
})
export class FixedCosts {
  private dialogs = inject(DialogService);
  private fixedCostsService = inject(FixedCostsDataService);
  private pricesService = inject(PricesDataService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private priceCalc = inject(PriceCalculationService);
  private settingsService = inject(PricingSettingsDataService);

  readonly fixedCosts = this.fixedCostsService.fixedCosts;
  readonly settings = this.settingsService.settings;
  readonly saving = signal(false);

  readonly loading = computed(() =>
    this.fixedCostsService.isLoading() || this.pricesService.isLoading() ||
    this.recipeTypesService.isLoading() || this.settingsService.isLoading()
  );

  readonly monthlyTotal = computed(() => totalMonthlyFixedCost(this.fixedCosts()));

  readonly hasPrices = computed(() => this.pricesService.prices().length > 0);

  /**
   * Lo que deja cada tipo de receta, sacado de los precios guardados.
   *
   * Un tipo puede tener varios precios —margarita, pepperoni— con
   * contribuciones distintas; se promedian, porque el equilibrio se calcula
   * sobre lo que se vende en conjunto y no sobre una pizza en particular.
   */
  private readonly products = computed<ProductContribution[]>(() => {
    const byType = new Map<string, { name: string; minutes: number; contributions: number[] }>();

    for (const price of this.pricesService.prices()) {
      const breakdown = this.priceCalc.breakdownOf(this.priceCalc.specOf(price));
      if (breakdown.price <= 0) continue;

      const key = breakdown.recipeTypeId ?? '';
      const entry = byType.get(key) ?? {
        name: this.recipeTypeName(breakdown.recipeTypeId),
        minutes: breakdown.productionMinutes,
        contributions: []
      };

      entry.contributions.push(breakdown.contribution);
      byType.set(key, entry);
    }

    return [...byType.entries()].map(([key, entry]) => ({
      recipeTypeId: key || null,
      name: entry.name,
      contribution: Math.round(
        (entry.contributions.reduce((sum, value) => sum + value, 0) / entry.contributions.length)
        * 100
      ) / 100,
      productionMinutes: entry.minutes
    }));
  });

  readonly breakEven = computed(() =>
    breakEven(this.monthlyTotal(), this.products(), this.settings().operatingDaysPerMonth)
  );

  private recipeTypeName(recipeTypeId: string | null): string {
    if (!recipeTypeId) return 'Sin tipo de receta';
    return this.recipeTypesService.recipeTypes().find(t => t.id === recipeTypeId)?.name
      ?? 'Sin tipo de receta';
  }

  addFixedCost() {
    const dialogRef = this.dialogs.openFullScreen<FixedCostDialog, FixedCostDialogResult>(
      FixedCostDialog, {}
    );

    dialogRef.afterClosed().subscribe(async (result: FixedCostDialogResult | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        await this.fixedCostsService.add(result);
      } catch (error) {
        console.error('Error adding fixed cost:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  editFixedCost(fixedCost: FixedCost) {
    const dialogRef = this.dialogs.openFullScreen<
      FixedCostDialog, FixedCostDialogResult | DeleteRequested
    >(FixedCostDialog, { fixedCost });

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia edición: la lista no tiene controles.
      if (result === DELETE_REQUESTED) return this.deleteFixedCost(fixedCost);
      if (!result || !fixedCost.id) return;

      this.saving.set(true);
      try {
        await this.fixedCostsService.update(fixedCost.id, { ...fixedCost, ...result });
      } catch (error) {
        console.error('Error updating fixed cost:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  deleteFixedCost(fixedCost: FixedCost) {
    if (!fixedCost.id) return;

    const dialogRef = this.dialogs.openConfirm<ConfirmDialog, boolean>(ConfirmDialog, {
      title: 'Confirmar eliminación',
      message: `¿Eliminar "${fixedCost.name}"? El punto de equilibrio bajará, pero el gasto ` +
        `se sigue pagando.`
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.saving.set(true);
      try {
        await this.fixedCostsService.remove(fixedCost.id!);
      } catch (error) {
        console.error('Error deleting fixed cost:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  editOperatingDays() {
    const dialogRef = this.dialogs.openFullScreen<OperatingDaysDialog, number>(
      OperatingDaysDialog, { operatingDaysPerMonth: this.settings().operatingDaysPerMonth }
    );

    dialogRef.afterClosed().subscribe(async (result: number | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        await this.settingsService.save({ operatingDaysPerMonth: result });
      } catch (error) {
        console.error('Error saving operating days:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }
}
