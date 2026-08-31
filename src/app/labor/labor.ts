import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Labor } from '../models/labor.model';
import { RecipeType } from '../models/recipe-type.model';
import { CatalogService } from '../services/catalog.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { ConsumptionsDataService } from '../services/consumptions-data.service';
import { LaborsDataService } from '../services/labors-data.service';
import { LaborDialog } from './labor-dialog';

@Component({
  selector: 'app-labor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './labor.html',
  styleUrl: './labor.css'
})
export class LaborConfig {
  private dialog = inject(MatDialog);
  private catalog = inject(CatalogService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private consumptionsService = inject(ConsumptionsDataService);
  private laborsService = inject(LaborsDataService);

  labors = this.laborsService.labors;
  recipeTypes = this.recipeTypesService.recipeTypes;
  consumptions = this.consumptionsService.consumptions;
  loading = computed(() =>
    this.recipeTypesService.isLoading() || this.consumptionsService.isLoading() ||
    this.catalog.isLoading() || this.laborsService.isLoading()
  );
  displayedColumns: string[] = ['name', 'items', 'actions'];

  getConsumptionName(consumptionId: string): string {
    const consumption = this.consumptions().find(c => c.id === consumptionId);
    return consumption ? consumption.name : 'Desconocido';
  }

  formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  }

  getLaborForType(recipeTypeId: string): Labor | undefined {
    return this.labors().find(l => l.recipeTypeId === recipeTypeId);
  }

  openDialog(recipeType: RecipeType) {
    const existingLabor = this.getLaborForType(recipeType.id!);

    const dialogRef = this.dialog.open(LaborDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        labor: existingLabor,
        recipeType,
        consumptions: this.consumptions(),
        costs: this.catalog.rateItems()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Labor | undefined) => {
      if (result) {
        try {
          if (existingLabor?.id) {
            await this.laborsService.update(existingLabor.id, result);
          } else {
            await this.laborsService.add(result);
          }
        } catch (error) {
          console.error('Error saving labor:', error);
        }
      }
    });
  }

  async deleteLabor(id: string) {
    try {
      await this.laborsService.remove(id);
    } catch (error) {
      console.error('Error deleting labor:', error);
    }
  }
}
