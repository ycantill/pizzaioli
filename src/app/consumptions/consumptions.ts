import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Consumption } from '../models/consumption.model';
import { CatalogService } from '../services/catalog.service';
import { UnitsDataService } from '../services/units-data.service';
import { ConsumptionsDataService } from '../services/consumptions-data.service';
import { ConsumptionDialog } from './consumption-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { getUnitAbbreviation, getUnitName } from '../shared/lookup.utils';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';

@Component({
  selector: 'app-consumptions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './consumptions.html',
  styleUrl: './consumptions.css'
})
export class Consumptions {
  private dialogs = inject(DialogService);
  private catalog = inject(CatalogService);
  private unitsService = inject(UnitsDataService);
  private consumptionsService = inject(ConsumptionsDataService);

  consumptions = this.consumptionsService.consumptions;
  costs = this.catalog.rateItems;
  units = this.unitsService.units;
  loading = computed(() =>
    this.catalog.isLoading() ||
    this.unitsService.isLoading() || this.consumptionsService.isLoading()
  );

  /** Los consumos siempre son de tarifas; ya no hace falta filtrar por tipo. */
  getServiceCosts() {
    return this.catalog.rateItems();
  }

  getCostName(rateId: string): string {
    return this.catalog.name(rateId);
  }

  getUnitName(rateId: string): string {
    const item = this.catalog.find(rateId);
    if (!item) return '';
    return getUnitName(this.units(), item.unitId);
  }

  /**
   * Aquí sí va la abreviatura, al revés que en tarifas: "160 gr/h" y
   * "24.000 $/h" se leen bien, porque la unidad acompaña a una cantidad y no
   * a un precio —en tarifas "$1,00 / $" no se entendía—.
   */
  unitAbbr(rateId: string): string {
    const item = this.catalog.find(rateId);
    if (!item) return '';
    return getUnitAbbreviation(this.units(), item.unitId);
  }

  addConsumption() {
    const dialogRef = this.dialogs.openFullScreen<ConsumptionDialog, Consumption>(
      ConsumptionDialog, {
        costs: this.getServiceCosts(),
        units: this.units()
      }
    );

    dialogRef.afterClosed().subscribe(async (result: Consumption | undefined) => {
      if (result) {
        try {
          await this.consumptionsService.add(result);
        } catch (error) {
          console.error('Error adding consumption:', error);
        }
      }
    });
  }

  editConsumption(consumption: Consumption) {
    const dialogRef = this.dialogs.openFullScreen<ConsumptionDialog, Consumption | DeleteRequested>(
      ConsumptionDialog, {
        consumption,
        costs: this.getServiceCosts(),
        units: this.units()
      }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia edición: la lista no tiene controles.
      if (result === DELETE_REQUESTED) return this.deleteConsumption(consumption);
      if (result && consumption.id) {
        try {
          await this.consumptionsService.update(consumption.id, result);
        } catch (error) {
          console.error('Error updating consumption:', error);
        }
      }
    });
  }

  async deleteConsumption(consumption: Consumption) {
    if (!consumption.id) return;

    const dialogRef = this.dialogs.openConfirm<ConfirmDialog, boolean>(ConfirmDialog, {
      title: 'Confirmar eliminación',
      message: `¿Eliminar el consumo "${consumption.name}"? La mano de obra que lo use dejará de ` +
        `contarlo en el precio.`
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean | undefined) => {
      if (confirmed) {
        try {
          await this.consumptionsService.remove(consumption.id!);
        } catch (error) {
          console.error('Error deleting consumption:', error);
        }
      }
    });
  }
}
