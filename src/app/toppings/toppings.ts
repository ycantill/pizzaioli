import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Topping } from '../models/topping.model';
import { CatalogService } from '../services/catalog.service';
import { UnitsDataService } from '../services/units-data.service';
import { ToppingsDataService } from '../services/toppings-data.service';
import { ToppingDialog } from './topping-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-toppings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './toppings.html',
  styleUrl: './toppings.css'
})
export class Toppings {
  private dialog = inject(MatDialog);
  private catalog = inject(CatalogService);
  private unitsService = inject(UnitsDataService);
  private toppingsService = inject(ToppingsDataService);

  costs = this.catalog.items;
  units = this.unitsService.units;
  toppings = this.toppingsService.toppings;
  loading = computed(() =>
    this.catalog.isLoading() || this.unitsService.isLoading() || this.toppingsService.isLoading()
  );
  displayedColumns: string[] = ['ingredient', 'quantity', 'size', 'salsaBase', 'actions'];
  sortActive = signal<'ingredient' | 'quantity' | 'size' | 'salsaBase'>('ingredient');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sortedToppings = computed(() => {
    const active = this.sortActive();
    const direction = this.sortDirection();
    const directionFactor = direction === 'asc' ? 1 : -1;
    const sizeOrder: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3, XXL: 4 };

    return [...this.toppingsService.toppings()].sort((a, b) => {
      if (active === 'ingredient') {
        const aName = this.getCostName(a.supplyId);
        const bName = this.getCostName(b.supplyId);
        return aName.localeCompare(bName, 'es') * directionFactor;
      }
      if (active === 'quantity') return (a.quantity - b.quantity) * directionFactor;
      if (active === 'salsaBase') return ((a.salsaBase ? 1 : 0) - (b.salsaBase ? 1 : 0)) * directionFactor;
      return ((sizeOrder[a.size] ?? 99) - (sizeOrder[b.size] ?? 99)) * directionFactor;
    });
  });

  onSortChange(sort: Sort) {
    if (!sort.active || !sort.direction) {
      this.sortActive.set('ingredient');
      this.sortDirection.set('asc');
      return;
    }
    this.sortActive.set(sort.active as 'ingredient' | 'quantity' | 'size' | 'salsaBase');
    this.sortDirection.set(sort.direction);
  }

  getCostName(supplyId: string): string {
    return this.catalog.name(supplyId);
  }

  openPrintWindow() {
    const groups = new Map<string, { product: string; rows: string }>();
    for (const topping of this.toppingsService.toppings()) {
      const item = this.catalog.find(topping.supplyId);
      if (!item) continue;
      const key = topping.supplyId;
      const row = `<tr><td>${topping.size}</td><td>${topping.quantity}g</td></tr>`;
      if (groups.has(key)) {
        groups.get(key)!.rows += row;
      } else {
        groups.set(key, { product: item.name, rows: row });
      }
    }

    const cardsHtml = Array.from(groups.values()).map(g => `
      <div class="card">
        <h2>${g.product}</h2>
        <table>
          <thead><tr><th>Tamaño</th><th>Cantidad</th></tr></thead>
          <tbody>${g.rows}</tbody>
        </table>
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Toppings</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { font-size: 1.4rem; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .card { border: 1px solid #ccc; border-radius: 4px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .card h2 { font-size: 0.95rem; margin: 0; padding: 8px 10px; background: #f0f0f0; border-bottom: 1px solid #ccc; }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
    th { text-align: left; padding: 4px 10px; background: #fafafa; border-bottom: 1px solid #ddd; color: #555; }
    td { padding: 4px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 0; } .grid { grid-template-columns: repeat(4, 1fr); } }
  </style>
</head>
<body>
  <h1>Toppings</h1>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  getUnitAbbreviation(supplyId: string): string {
    const cost = this.catalog.find(supplyId);
    if (!cost) return '';
    const unit = this.units().find(u => u.id === cost.unitId);
    return unit ? unit.abbreviation : '';
  }

  addTopping() {
    const dialogRef = this.dialog.open(ToppingDialog, {
      width: '400px',
      data: { costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Topping | undefined) => {
      if (result) {
        try {
          await this.toppingsService.add(result);
        } catch (error) {
          console.error('Error adding topping:', error);
        }
      }
    });
  }

  editTopping(topping: Topping) {
    const dialogRef = this.dialog.open(ToppingDialog, {
      width: '400px',
      data: { topping, costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Topping | undefined) => {
      if (result && topping.id) {
        try {
          await this.toppingsService.update(topping.id, result);
        } catch (error) {
          console.error('Error updating topping:', error);
        }
      }
    });
  }

  async deleteTopping(topping: Topping) {
    if (!topping.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar este topping?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.toppingsService.remove(topping.id!);
        } catch (error) {
          console.error('Error deleting topping:', error);
        }
      }
    });
  }
}
