import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Dough } from '../models/dough.model';
import { CostsDataService } from '../services/costs-data.service';
import { CostTypesDataService } from '../services/cost-types-data.service';
import { DoughsDataService } from '../services/doughs-data.service';
import { DoughDialog } from './dough-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { getCostName } from '../shared/lookup.utils';

@Component({
  selector: 'app-doughs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './doughs.html',
  styleUrl: './doughs.css'
})
export class Doughs {
  private dialog = inject(MatDialog);
  private costsService = inject(CostsDataService);
  private costTypesService = inject(CostTypesDataService);
  private doughsService = inject(DoughsDataService);

  doughs = this.doughsService.doughs;
  loading = computed(() =>
    this.costTypesService.isLoading() || this.costsService.isLoading() || this.doughsService.isLoading()
  );
  displayedColumns: string[] = ['name', 'ballWeight', 'ingredients', 'actions'];

  ingredientCosts = computed(() => {
    const ingredienteType = this.costTypesService.costTypes().find(t => t.name.toLowerCase() === 'ingrediente');
    return ingredienteType
      ? this.costsService.costs().filter(c => c.typeId === ingredienteType.id)
      : this.costsService.costs();
  });

  getCostName(costId: string): string {
    return getCostName(this.costsService.costs(), costId);
  }

  addDough() {
    const dialogRef = this.dialog.open(DoughDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { costs: this.ingredientCosts() }
    });

    dialogRef.afterClosed().subscribe(async (result: Dough | undefined) => {
      if (result) {
        try {
          await this.doughsService.add(result);
        } catch (error) {
          console.error('Error adding dough:', error);
        }
      }
    });
  }

  editDough(dough: Dough) {
    const dialogRef = this.dialog.open(DoughDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { dough, costs: this.ingredientCosts() }
    });

    dialogRef.afterClosed().subscribe(async (result: Dough | undefined) => {
      if (result && dough.id) {
        try {
          await this.doughsService.update(dough.id, result);
        } catch (error) {
          console.error('Error updating dough:', error);
        }
      }
    });
  }

  async deleteDough(dough: Dough) {
    if (!dough.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${dough.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.doughsService.remove(dough.id!);
        } catch (error) {
          console.error('Error deleting dough:', error);
        }
      }
    });
  }
}
