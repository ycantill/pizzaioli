import { Component, computed, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Topping } from '../models/topping.model';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
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
export class Toppings implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  toppings = signal<Topping[]>([]);
  costs = signal<Cost[]>([]);
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['ingredient', 'quantity', 'size', 'actions'];
  sortActive = signal<'ingredient' | 'quantity' | 'size'>('ingredient');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sortedToppings = computed(() => {
    const active = this.sortActive();
    const direction = this.sortDirection();
    const directionFactor = direction === 'asc' ? 1 : -1;
    const sizeOrder: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3, XXL: 4 };

    return [...this.toppings()].sort((a, b) => {
      if (active === 'ingredient') {
        const aName = this.getCostName(a.costId);
        const bName = this.getCostName(b.costId);
        return aName.localeCompare(bName, 'es') * directionFactor;
      }

      if (active === 'quantity') {
        return (a.quantity - b.quantity) * directionFactor;
      }

      return ((sizeOrder[a.size] ?? 99) - (sizeOrder[b.size] ?? 99)) * directionFactor;
    });
  });

  async ngOnInit() {
    await Promise.all([this.loadCosts(), this.loadUnits()]);
    await this.loadToppings();
  }

  async loadCosts() {
    try {
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
    } catch (error) {
      console.error('Error loading costs:', error);
    }
  }

  async loadUnits() {
    try {
      const data = await this.firestoreService.getDocuments('units');
      this.units.set(data as Unit[]);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  }

  async loadToppings() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('toppings');
      this.toppings.set(data as Topping[]);
    } catch (error) {
      console.error('Error loading toppings:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onSortChange(sort: Sort) {
    if (!sort.active || !sort.direction) {
      this.sortActive.set('ingredient');
      this.sortDirection.set('asc');
      return;
    }

    this.sortActive.set(sort.active as 'ingredient' | 'quantity' | 'size');
    this.sortDirection.set(sort.direction);
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  openPrintWindow() {
    const allCosts = this.costs();
    // Group toppings by product
    const groups = new Map<string, { product: string; rows: string }>();
    for (const topping of this.toppings()) {
      const cost = allCosts.find(c => c.id === topping.costId);
      if (!cost) continue;
      const key = topping.costId;
      const row = `<tr><td>${topping.size}</td><td>${topping.quantity}g</td></tr>`;
      if (groups.has(key)) {
        groups.get(key)!.rows += row;
      } else {
        groups.set(key, { product: cost.product, rows: row });
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

  getUnitAbbreviation(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
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
          const docRef = await this.firestoreService.addDocument('toppings', result);
          this.toppings.update(list => [...list, { ...result, id: docRef.id }]);
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
          await this.firestoreService.updateDocument('toppings', topping.id, result);
          this.toppings.update(list =>
            list.map(t => t.id === topping.id ? { ...result, id: topping.id } : t)
          );
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
          await this.firestoreService.deleteDocument('toppings', topping.id!);
          this.toppings.update(list => list.filter(t => t.id !== topping.id));
        } catch (error) {
          console.error('Error deleting topping:', error);
        }
      }
    });
  }
}
