import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MarginConfig } from '../models/margin-config.model';
import { PricedItem } from '../models/priced-item.model';
import { CatalogService } from '../services/catalog.service';
import { marginPercent } from '../services/pricing';
import { MarginDialog } from './margin-dialog';

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
  private catalog = inject(CatalogService);

  loading = this.catalog.isLoading;
  saving = signal(false);

  /**
   * El margen vive embebido en cada insumo y tarifa, así que la lista es el
   * catálogo completo: no se crean ni se borran márgenes por separado.
   */
  items = computed(() =>
    [...this.catalog.items()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  );

  displayedColumns: string[] = ['name', 'kind', 'recovery', 'reinvestment', 'profit', 'total', 'actions'];

  getTotalMargin(margin: MarginConfig): number {
    return marginPercent(margin);
  }

  kindLabel(id: string): string {
    return this.catalog.kindOf(id) === 'rate' ? 'Tarifa' : 'Insumo';
  }

  editMargin(item: PricedItem) {
    const dialogRef = this.dialog.open(MarginDialog, {
      width: '500px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe(async (result: MarginConfig | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        await this.catalog.updateMargin(item.id, result);
      } catch (error) {
        console.error('Error updating margin:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }
}
