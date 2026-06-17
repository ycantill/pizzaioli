import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Margin } from '../models/margin.model';
import { CostsDataService } from '../services/costs-data.service';
import { MarginsDataService } from '../services/margins-data.service';
import { MarginDialog } from './margin-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { getCostName } from '../shared/lookup.utils';

@Component({
  selector: 'app-margins',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './margins.html',
  styleUrl: './margins.css'
})
export class Margins {
  private dialog = inject(MatDialog);
  private costsService = inject(CostsDataService);
  private marginsService = inject(MarginsDataService);

  margins = this.marginsService.margins;
  costs = this.costsService.costs;
  loading = computed(() => this.costsService.isLoading() || this.marginsService.isLoading());
  displayedColumns: string[] = ['cost', 'recovery', 'reinvestment', 'profit', 'total', 'actions'];

  getCostName(costId: string): string {
    return getCostName(this.costs(), costId);
  }

  getTotalMargin(margin: Margin): number {
    return margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage;
  }

  addMargin() {
    const dialogRef = this.dialog.open(MarginDialog, {
      width: '500px',
      data: { costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Margin | undefined) => {
      if (result) {
        try {
          await this.marginsService.add(result);
        } catch (error) {
          console.error('Error adding margin:', error);
        }
      }
    });
  }

  editMargin(margin: Margin) {
    const dialogRef = this.dialog.open(MarginDialog, {
      width: '500px',
      data: { margin, costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Margin | undefined) => {
      if (result && margin.id) {
        try {
          await this.marginsService.update(margin.id, result);
        } catch (error) {
          console.error('Error updating margin:', error);
        }
      }
    });
  }

  async deleteMargin(margin: Margin) {
    if (!margin.id) return;

    const costName = this.getCostName(margin.costId);
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el margen de "${costName}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.marginsService.remove(margin.id!);
        } catch (error) {
          console.error('Error deleting margin:', error);
        }
      }
    });
  }
}
