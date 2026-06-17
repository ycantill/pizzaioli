import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Packaging } from '../models/packaging.model';
import { RecipeType } from '../models/recipe-type.model';
import { CostsDataService } from '../services/costs-data.service';
import { CostTypesDataService } from '../services/cost-types-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { PackagingsDataService } from '../services/packagings-data.service';
import { PackagingDialog } from './packaging-dialog';
import { getCostName } from '../shared/lookup.utils';

@Component({
  selector: 'app-packaging',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './packaging.html',
  styleUrl: './packaging.css'
})
export class PackagingConfig {
  private dialog = inject(MatDialog);
  private costsService = inject(CostsDataService);
  private costTypesService = inject(CostTypesDataService);
  private unitsService = inject(UnitsDataService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private packagingsService = inject(PackagingsDataService);

  packagings = this.packagingsService.packagings;
  recipeTypes = this.recipeTypesService.recipeTypes;
  loading = computed(() =>
    this.recipeTypesService.isLoading() || this.costTypesService.isLoading() ||
    this.costsService.isLoading() || this.unitsService.isLoading() || this.packagingsService.isLoading()
  );
  displayedColumns: string[] = ['name', 'items', 'actions'];

  getRecipeTypeName(recipeTypeId: string): string {
    const type = this.recipeTypes().find(t => t.id === recipeTypeId);
    return type ? type.name : 'Desconocido';
  }

  getCostName(costId: string): string {
    return getCostName(this.costsService.costs(), costId);
  }

  getPackagingForType(recipeTypeId: string): Packaging | undefined {
    return this.packagings().find(d => d.recipeTypeId === recipeTypeId);
  }

  openDialog(recipeType: RecipeType) {
    const existingPackaging = this.getPackagingForType(recipeType.id!);

    const ingredienteType = this.costTypesService.costTypes().find(t => t.name.toLowerCase() === 'ingrediente');
    const filteredCosts = ingredienteType
      ? this.costsService.costs().filter(cost => cost.typeId !== ingredienteType.id)
      : this.costsService.costs();

    const dialogRef = this.dialog.open(PackagingDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        packaging: existingPackaging,
        recipeType,
        costs: filteredCosts,
        units: this.unitsService.units()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Packaging | undefined) => {
      if (result) {
        try {
          if (existingPackaging?.id) {
            await this.packagingsService.update(existingPackaging.id, result);
          } else {
            await this.packagingsService.add(result);
          }
        } catch (error) {
          console.error('Error saving packaging:', error);
        }
      }
    });
  }

  async deletePackaging(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta configuración de paquetería?')) {
      try {
        await this.packagingsService.remove(id);
      } catch (error) {
        console.error('Error deleting packaging:', error);
      }
    }
  }
}
