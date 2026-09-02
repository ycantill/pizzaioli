import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Unit } from '../models/unit.model';
import { UnitsDataService } from '../services/units-data.service';
import { UnitDialog } from './unit-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-units',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './units.html',
  styleUrl: './units.css'
})
export class Units {
  private dialog = inject(MatDialog);
  private unitsService = inject(UnitsDataService);

  units = this.unitsService.units;
  loading = this.unitsService.isLoading;
  displayedColumns: string[] = ['name', 'abbreviation', 'actions'];

  addUnit() {
    const dialogRef = this.dialog.open(UnitDialog, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(async (result: Unit | undefined) => {
      if (result) {
        try {
          await this.unitsService.add(result);
        } catch (error) {
          console.error('Error adding unit:', error);
        }
      }
    });
  }

  editUnit(unit: Unit) {
    const dialogRef = this.dialog.open(UnitDialog, {
      width: '400px',
      data: { unit }
    });

    dialogRef.afterClosed().subscribe(async (result: Unit | undefined) => {
      if (result && unit.id) {
        try {
          await this.unitsService.update(unit.id, result);
        } catch (error) {
          console.error('Error updating unit:', error);
        }
      }
    });
  }

  async deleteUnit(unit: Unit) {
    if (!unit.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${unit.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.unitsService.remove(unit.id!);
        } catch (error) {
          console.error('Error deleting unit:', error);
        }
      }
    });
  }
}
