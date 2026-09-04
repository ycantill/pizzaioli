import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Preparation, yieldOf, defaultQuantityOf } from '../models/preparation.model';
import { CatalogService } from '../services/catalog.service';
import { PreparationsDataService } from '../services/preparations-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { getUnitAbbreviation } from '../shared/lookup.utils';
import { PreparationDialog } from './preparation-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-preparations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './preparations.html',
  styleUrl: './preparations.css'
})
export class Preparations {
  private dialog = inject(MatDialog);
  private catalog = inject(CatalogService);
  private preparationsService = inject(PreparationsDataService);
  private unitsService = inject(UnitsDataService);

  preparations = this.preparationsService.preparations;
  loading = computed(() =>
    this.catalog.isLoading() || this.preparationsService.isLoading() ||
    this.unitsService.isLoading()
  );
  displayedColumns: string[] = ['name', 'yield', 'perUnit', 'ingredients', 'actions'];

  ingredientCosts = this.catalog.ingredients;

  getCostName(supplyId: string): string {
    return this.catalog.name(supplyId);
  }

  /** Lo que rinde el lote, con su unidad: "1.678 g" o "250 ml". */
  yieldLabel(preparation: Preparation): string {
    const unit = getUnitAbbreviation(this.unitsService.units(), preparation.yieldUnitId ?? '');
    return `${Math.round(yieldOf(preparation) * 100) / 100}${unit ? ' ' + unit : ''}`;
  }

  /** Solo se anuncia si está definida: no toda preparación tiene una porción fija. */
  perUnitLabel(preparation: Preparation): string {
    const quantity = defaultQuantityOf(preparation);
    if (!quantity) return '';

    const unit = getUnitAbbreviation(this.unitsService.units(), preparation.yieldUnitId ?? '');
    return `${quantity}${unit ? ' ' + unit : ''}`;
  }

  addPreparation() {
    const dialogRef = this.dialog.open(PreparationDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { costs: this.ingredientCosts(), units: this.unitsService.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: Preparation | undefined) => {
      if (!result) return;

      try {
        await this.preparationsService.add(result);
      } catch (error) {
        console.error('Error adding preparation:', error);
      }
    });
  }

  editPreparation(preparation: Preparation) {
    const dialogRef = this.dialog.open(PreparationDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { preparation, costs: this.ingredientCosts(), units: this.unitsService.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: Preparation | undefined) => {
      if (!result || !preparation.id) return;

      try {
        await this.preparationsService.update(preparation.id, result);
      } catch (error) {
        console.error('Error updating preparation:', error);
      }
    });
  }

  async deletePreparation(preparation: Preparation) {
    if (!preparation.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Eliminar "${preparation.name}"? Los precios que la consuman perderán ` +
          `su costo.`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;

      try {
        await this.preparationsService.remove(preparation.id!);
      } catch (error) {
        console.error('Error deleting preparation:', error);
      }
    });
  }
}
