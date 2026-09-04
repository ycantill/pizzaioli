import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { batchSizeOf, Labor, LaborItem, minutesPerUnit } from '../models/labor.model';
import { RecipeType } from '../models/recipe-type.model';
import { Size, sizesOf } from '../models/size.model';
import { RatesDataService } from '../services/rates-data.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { ConsumptionsDataService } from '../services/consumptions-data.service';
import { LaborsDataService } from '../services/labors-data.service';
import { SizesDataService } from '../services/sizes-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { resolveLaborItem } from '../services/labor-rates';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';
import { formatMinutes } from '../shared/format.utils';
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
  private ratesService = inject(RatesDataService);
  private unitsService = inject(UnitsDataService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private consumptionsService = inject(ConsumptionsDataService);
  private laborsService = inject(LaborsDataService);
  private sizesService = inject(SizesDataService);

  labors = this.laborsService.labors;
  recipeTypes = this.recipeTypesService.recipeTypes;
  loading = computed(() =>
    this.recipeTypesService.isLoading() || this.consumptionsService.isLoading() ||
    this.ratesService.isLoading() || this.laborsService.isLoading() ||
    this.sizesService.isLoading()
  );

  /** El nombre de la tarifa que consume esa línea, sea nueva o vieja. */
  getRateName(item: LaborItem): string {
    const resolved = resolveLaborItem(
      item, this.ratesService.rates(), this.consumptionsService.consumptions()
    );
    return resolved?.name ?? 'Desconocido';
  }

  /**
   * Lo que suma una configuración entera, ya repartido por tanda: es el tiempo
   * que se le cobra a una unidad, no el que se está de pie en la cocina.
   */
  totalMinutes(labor: Labor): number {
    return labor.items.reduce((suma, item) => suma + minutesPerUnit(item), 0);
  }

  minutesPerUnit(item: LaborItem): number {
    return minutesPerUnit(item);
  }

  /** Solo se anuncia la tanda cuando reparte: "÷1" sería ruido. */
  batchLabel(item: LaborItem): string {
    const batch = batchSizeOf(item);
    return batch > 1 ? `tanda de ${batch}` : '';
  }

  formatMinutes(totalMinutes: number): string {
    return formatMinutes(totalMinutes);
  }

  /**
   * Las filas de una familia: la que vale para todos los tamaños y una por
   * tamaño, porque una familiar ocupa más horno que una personal.
   */
  rowsFor(recipeTypeId: string | undefined): (Size | null)[] {
    return [null, ...sizesOf(this.sizesService.sizes(), recipeTypeId)];
  }

  /** Lo configurado para esa fila exacta, sin caer en el defecto. */
  getLaborFor(recipeTypeId: string, sizeId: string | null): Labor | undefined {
    return this.labors().find(l =>
      l.recipeTypeId === recipeTypeId && (l.sizeId ?? null) === sizeId
    );
  }

  rowLabel(size: Size | null): string {
    return size ? size.name : 'Todos los tamaños';
  }

  openDialog(recipeType: RecipeType, size: Size | null) {
    const existingLabor = this.getLaborFor(recipeType.id!, size?.id ?? null);

    const dialogRef = this.dialogs.openFullScreen<LaborDialog, Labor | DeleteRequested>(
      LaborDialog,
      {
        labor: existingLabor,
        recipeType,
        size,
        rates: this.ratesService.rates(),
        units: this.unitsService.units(),
        legacyConsumptions: this.consumptionsService.consumptions()
      }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia configuración: la lista no tiene controles.
      if (result === DELETE_REQUESTED) {
        if (existingLabor?.id) {
          this.deleteLabor(existingLabor.id, `${recipeType.name} (${this.rowLabel(size)})`);
        }
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
