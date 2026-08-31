import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DEFAULT_MARGIN } from '../models/margin-config.model';
import { Rate } from '../models/rate.model';
import { RatesDataService } from '../services/rates-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { getUnitName } from '../shared/lookup.utils';
import { RateDialog, RateDialogResult } from './rate-dialog';

@Component({
  selector: 'app-rates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './rates.html',
  styleUrl: './rates.css'
})
export class Rates {
  private dialog = inject(MatDialog);
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

  readonly displayedColumns = ['name', 'unit', 'value', 'actions'];

  unitName(unitId: string): string {
    return getUnitName(this.units(), unitId) || unitId;
  }

  addRate() {
    const dialogRef = this.dialog.open(RateDialog, {
      width: '440px',
      data: { units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: RateDialogResult | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        await this.ratesService.add({ ...result, margin: DEFAULT_MARGIN });
      } catch (error) {
        console.error('Error adding rate:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  editRate(rate: Rate) {
    const dialogRef = this.dialog.open(RateDialog, {
      width: '440px',
      data: { rate, units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: RateDialogResult | undefined) => {
      if (!result || !rate.id) return;

      this.saving.set(true);
      try {
        // El margen embebido se conserva: aquí solo se edita la tarifa.
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

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '440px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Eliminar la tarifa "${rate.name}"? Los consumos que la usen quedarán sin costo.`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
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
