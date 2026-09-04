import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Packaging } from '../models/packaging.model';
import { RecipeType } from '../models/recipe-type.model';
import { CatalogService } from '../services/catalog.service';
import { UnitsDataService } from '../services/units-data.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { PackagingsDataService } from '../services/packagings-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';
import { PackagingDialog } from './packaging-dialog';

@Component({
  selector: 'app-packaging',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './packaging.html',
  styleUrl: './packaging.css'
})
export class PackagingConfig {
  private dialogs = inject(DialogService);
  private catalog = inject(CatalogService);
  private unitsService = inject(UnitsDataService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private packagingsService = inject(PackagingsDataService);

  packagings = this.packagingsService.packagings;
  recipeTypes = this.recipeTypesService.recipeTypes;
  loading = computed(() =>
    this.recipeTypesService.isLoading() || this.catalog.isLoading() ||
    this.unitsService.isLoading() || this.packagingsService.isLoading()
  );

  getRecipeTypeName(recipeTypeId: string): string {
    const type = this.recipeTypes().find(t => t.id === recipeTypeId);
    return type ? type.name : 'Desconocido';
  }

  getCostName(supplyId: string): string {
    return this.catalog.name(supplyId);
  }

  getPackagingForType(recipeTypeId: string): Packaging | undefined {
    return this.packagings().find(d => d.recipeTypeId === recipeTypeId);
  }

  openDialog(recipeType: RecipeType) {
    const existingPackaging = this.getPackagingForType(recipeType.id!);

    const filteredCosts = this.catalog.packagingSupplies();

    const dialogRef = this.dialogs.openFullScreen<PackagingDialog, Packaging | DeleteRequested>(
      PackagingDialog,
      {
        packaging: existingPackaging,
        recipeType,
        costs: filteredCosts,
        units: this.unitsService.units()
      }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia configuración: la lista no tiene controles.
      if (result === DELETE_REQUESTED) {
        if (existingPackaging?.id) this.deletePackaging(existingPackaging.id, recipeType.name);
        return;
      }
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

  /**
   * Antes usaba el confirm() del navegador, que no se parece en nada al resto
   * de la app y no se puede leer con la piel puesta.
   */
  deletePackaging(id: string, recipeTypeName: string) {
    const dialogRef = this.dialogs.openConfirm<ConfirmDialog, boolean>(ConfirmDialog, {
      title: 'Confirmar eliminación',
      message: `¿Eliminar la paquetería de "${recipeTypeName}"? El precio de venta dejará de ` +
        `incluir su costo.`
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean | undefined) => {
      if (!confirmed) return;

      try {
        await this.packagingsService.remove(id);
      } catch (error) {
        console.error('Error deleting packaging:', error);
      }
    });
  }
}
