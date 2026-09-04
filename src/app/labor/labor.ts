import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Labor } from '../models/labor.model';
import { RecipeType } from '../models/recipe-type.model';
import { CatalogService } from '../services/catalog.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { ConsumptionsDataService } from '../services/consumptions-data.service';
import { LaborsDataService } from '../services/labors-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';
import { LaborDialog } from './labor-dialog';

@Component({
  selector: 'app-labor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './labor.html',
  styleUrl: './labor.css'
})
export class LaborConfig {
  private dialogs = inject(DialogService);
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

  getConsumptionName(consumptionId: string): string {
    const consumption = this.consumptions().find(c => c.id === consumptionId);
    return consumption ? consumption.name : 'Desconocido';
  }

  /** Lo que suma una configuración entera, que es lo que interesa de un vistazo. */
  totalMinutes(labor: Labor): number {
    return labor.items.reduce((suma, item) => suma + item.minutes, 0);
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

    const dialogRef = this.dialogs.openFullScreen<LaborDialog, Labor | DeleteRequested>(
      LaborDialog,
      {
        labor: existingLabor,
        recipeType,
        consumptions: this.consumptions(),
        costs: this.catalog.rateItems()
      }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia configuración: la lista no tiene controles.
      if (result === DELETE_REQUESTED) {
        if (existingLabor?.id) this.deleteLabor(existingLabor.id, recipeType.name);
        return;
      }
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

  /**
   * Antes borraba sin preguntar nada, desde un icono de la lista: una acción
   * destructiva a un toque de distancia y sin vuelta atrás.
   */
  deleteLabor(id: string, recipeTypeName: string) {
    const dialogRef = this.dialogs.openConfirm<ConfirmDialog, boolean>(ConfirmDialog, {
      title: 'Confirmar eliminación',
      message: `¿Eliminar la mano de obra de "${recipeTypeName}"? El precio de venta dejará de ` +
        `incluir su costo.`
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean | undefined) => {
      if (!confirmed) return;

      try {
        await this.laborsService.remove(id);
      } catch (error) {
        console.error('Error deleting labor:', error);
      }
    });
  }
}
