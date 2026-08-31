import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CostType } from '../models/cost-type.model';
import { inferCostTypeKind } from '../services/catalog.service';
import { CostTypesDataService } from '../services/cost-types-data.service';
import { CostTypeDialog } from './cost-type-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-cost-types',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './cost-types.html',
  styleUrl: './cost-types.css'
})
export class CostTypes {
  private dialog = inject(MatDialog);
  private costTypesService = inject(CostTypesDataService);

  costTypes = this.costTypesService.costTypes;
  loading = this.costTypesService.isLoading;
  displayedColumns: string[] = ['name', 'kind', 'actions'];

  kindLabel(costType: CostType): string {
    const kind = costType.kind ?? inferCostTypeKind(costType.name);
    if (kind === 'paqueteria') return 'Paquetería';
    if (kind === 'ingrediente') return 'Ingrediente';
    return 'Sin clasificar';
  }

  addCostType() {
    const dialogRef = this.dialog.open(CostTypeDialog, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(async (result: CostType | undefined) => {
      if (result) {
        try {
          await this.costTypesService.add(result);
        } catch (error) {
          console.error('Error adding cost type:', error);
        }
      }
    });
  }

  editCostType(costType: CostType) {
    const dialogRef = this.dialog.open(CostTypeDialog, {
      width: '400px',
      data: { costType }
    });

    dialogRef.afterClosed().subscribe(async (result: CostType | undefined) => {
      if (result && costType.id) {
        try {
          await this.costTypesService.update(costType.id, result);
        } catch (error) {
          console.error('Error updating cost type:', error);
        }
      }
    });
  }

  deleteCostType(costType: CostType) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el tipo "${costType.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && costType.id) {
        try {
          await this.costTypesService.remove(costType.id);
        } catch (error) {
          console.error('Error deleting cost type:', error);
        }
      }
    });
  }
}
