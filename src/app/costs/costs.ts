import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Cost } from '../models/cost.model';
import { CostsDataService } from '../services/costs-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { CostTypesDataService } from '../services/cost-types-data.service';
import { MarginsDataService } from '../services/margins-data.service';
import { CostDialog } from './cost-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { getUnitName } from '../shared/lookup.utils';

@Component({
  selector: 'app-costs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './costs.html',
  styleUrl: './costs.css'
})
export class Costs {
  private dialog = inject(MatDialog);
  private costsService = inject(CostsDataService);
  private unitsService = inject(UnitsDataService);
  private costTypesService = inject(CostTypesDataService);
  private marginsService = inject(MarginsDataService);

  costs = this.costsService.costs;
  units = this.unitsService.units;
  costTypes = this.costTypesService.costTypes;
  loading = computed(() =>
    this.unitsService.isLoading() || this.costTypesService.isLoading() || this.costsService.isLoading()
  );
  displayedColumns: string[] = ['product', 'value', 'unit', 'type', 'actions'];

  getUnitName(unitId: string): string {
    return getUnitName(this.units(), unitId) || unitId;
  }

  getTypeName(typeId: string): string {
    if (!typeId) return 'Sin tipo';
    const type = this.costTypes().find(t => t.id === typeId);
    return type ? type.name : 'N/A';
  }

  addCost() {
    const dialogRef = this.dialog.open(CostDialog, {
      width: '400px',
      data: { units: this.units(), costTypes: this.costTypes() }
    });

    dialogRef.afterClosed().subscribe(async (result: Cost | undefined) => {
      if (result) {
        try {
          const newId = await this.costsService.add(result);
          await this.marginsService.add({
            costId: newId,
            recoveryPercentage: 100,
            reinvestmentPercentage: 100,
            profitPercentage: 100
          });
        } catch (error) {
          console.error('Error adding cost:', error);
        }
      }
    });
  }

  editCost(cost: Cost) {
    const dialogRef = this.dialog.open(CostDialog, {
      width: '400px',
      data: { cost, units: this.units(), costTypes: this.costTypes() }
    });

    dialogRef.afterClosed().subscribe(async (result: Cost | undefined) => {
      if (result && cost.id) {
        try {
          await this.costsService.update(cost.id, result);
        } catch (error) {
          console.error('Error updating cost:', error);
        }
      }
    });
  }

  async deleteCost(cost: Cost) {
    if (!cost.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${cost.product}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.costsService.remove(cost.id!);
        } catch (error) {
          console.error('Error deleting cost:', error);
        }
      }
    });
  }
}
