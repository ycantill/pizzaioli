import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { quantityPerHourOf, Rate } from '../models/rate.model';
import { RatesDataService } from '../services/rates-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';
import { getUnitAbbreviation, getUnitName } from '../shared/lookup.utils';
import { RateDialog, RateDialogResult } from './rate-dialog';

@Component({
  selector: 'app-rates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './rates.html',
  styleUrl: './rates.css'
})
export class Rates {
  private dialogs = inject(DialogService);
  private ratesService = inject(RatesDataService);
  private unitsService = inject(UnitsDataService);

  readonly loading = computed(() =>
    this.ratesService.isLoading() || this.unitsService.isLoading()
  );
  readonly saving = signal(false);
  readonly units = this.unitsService.units;

  readonly rates = computed(() =>
    [...this.ratesService.rates()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  );

  unitName(unitId: string): string {
    return getUnitName(this.units(), unitId) || unitId;
  }

  /** El ritmo de consumo solo se anuncia cuando dice algo: "1/h" es el defecto. */
  perHour(rate: Rate): string {
    const quantity = quantityPerHourOf(rate);
    if (quantity === 1) return '';
    return `${quantity} ${getUnitAbbreviation(this.units(), rate.unitId)}/h`;
  }

  addRate() {
    const dialogRef = this.dialogs.openFullScreen<RateDialog, RateDialogResult>(RateDialog, { units: this.units() });

    dialogRef.afterClosed().subscribe(async (result: RateDialogResult | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        await this.ratesService.add(result);
      } catch (error) {
        console.error('Error adding rate:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  editRate(rate: Rate) {
    const dialogRef = this.dialogs.openFullScreen<RateDialog, RateDialogResult | DeleteRequested>(
      RateDialog, { rate, units: this.units() }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia edición: la lista no tiene controles.
      if (result === DELETE_REQUESTED) return this.deleteRate(rate);
      if (!result || !rate.id) return;

      this.saving.set(true);
      try {
        await this.ratesService.update(rate.id, { ...rate, ...result });
      } catch (error) {
        console.error('Error updating rate:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  deleteRate(rate: Rate) {
    if (!rate.id) return;

    const dialogRef = this.dialogs.openConfirm<ConfirmDialog, boolean>(ConfirmDialog, {
      title: 'Confirmar eliminación',
      message: `¿Eliminar la tarifa "${rate.name}"? Los consumos que la usen quedarán sin costo.`
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.saving.set(true);
      try {
        await this.ratesService.remove(rate.id!);
      } catch (error) {
        console.error('Error deleting rate:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }
}
