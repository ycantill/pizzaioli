import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Consumption } from '../models/consumption.model';
import { CostsDataService } from '../services/costs-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { CostTypesDataService } from '../services/cost-types-data.service';
import { ConsumptionsDataService } from '../services/consumptions-data.service';
import { ConsumptionDialog } from './consumption-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { getCostName, getUnitName } from '../shared/lookup.utils';

@Component({
  selector: 'app-consumptions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './consumptions.html',
  styleUrl: './consumptions.css'
})
export class Consumptions {
  private dialog = inject(MatDialog);
  private costsService = inject(CostsDataService);
  private unitsService = inject(UnitsDataService);
  private costTypesService = inject(CostTypesDataService);
  private consumptionsService = inject(ConsumptionsDataService);

  consumptions = this.consumptionsService.consumptions;
  costs = this.costsService.costs;
  units = this.unitsService.units;
  loading = computed(() =>
    this.costTypesService.isLoading() || this.costsService.isLoading() ||
    this.unitsService.isLoading() || this.consumptionsService.isLoading()
  );
  displayedColumns: string[] = ['name', 'service', 'quantity', 'actions'];

  getServiceCosts() {
    const servicioType = this.costTypesService.costTypes().find(t => t.name.toLowerCase() === 'servicio');
    return servicioType
      ? this.costs().filter(cost => cost.typeId === servicioType.id)
      : [];
  }

  getCostName(costId: string): string {
    return getCostName(this.costs(), costId);
  }

  getUnitName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    if (!cost) return '';
    return getUnitName(this.units(), cost.unitId);
  }

  addConsumption() {
    const dialogRef = this.dialog.open(ConsumptionDialog, {
      width: '500px',
      data: {
        costs: this.getServiceCosts(),
        units: this.units()
      }
    });

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
    const dialogRef = this.dialog.open(ConsumptionDialog, {
      width: '500px',
      data: {
        consumption,
        costs: this.getServiceCosts(),
        units: this.units()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Consumption | undefined) => {
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

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar este consumo?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
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
