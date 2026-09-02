import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Supply } from '../models/supply.model';
import { CatalogService } from '../services/catalog.service';
import { SupplyCategoriesDataService } from '../services/supply-categories-data.service';
import { InventoryService } from '../services/inventory.service';
import { SuppliesDataService } from '../services/supplies-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DEFAULT_MARGIN } from '../models/margin-config.model';
import { getUnitAbbreviation, getUnitName } from '../shared/lookup.utils';
import { describeUnit } from '../services/unit-conversion';
import { MovementDialog, MovementDialogResult, MovementKind } from './movement-dialog';
import { SupplyAction, SupplyRow } from './supply-row';

import { SupplyDialog, SupplyDialogResult } from './supply-dialog';

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    SupplyRow
  ],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class Inventory {
  private dialog = inject(MatDialog);
  private inventoryService = inject(InventoryService);
  private unitsService = inject(UnitsDataService);
  private categoriesService = inject(SupplyCategoriesDataService);
  private catalog = inject(CatalogService);
  private suppliesService = inject(SuppliesDataService);

  readonly loading = computed(() =>
    this.inventoryService.isLoading() || this.unitsService.isLoading() ||
    this.categoriesService.isLoading()
  );

  readonly supplies = computed(() =>
    [...this.inventoryService.supplies()].sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly lowStock = this.inventoryService.lowStockSupplies;
  readonly mislabeled = this.inventoryService.mislabeledUnits;
  readonly expandedId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly auditIssues = signal<string[] | null>(null);

  readonly units = this.unitsService.units;
  readonly categories = this.catalog.supplyCategories;

  readonly search = signal('');
  readonly soloBajoMinimo = signal(false);

  /**
   * La despensa se piensa por categoría (harinas, quesos, salsas), así que la
   * lista se agrupa igual. El filtro va antes del agrupado para que no queden
   * cabeceras de categorías vacías.
   */
  readonly groups = computed(() => {
    const term = this.search().trim().toLowerCase();
    const soloBajos = this.soloBajoMinimo();

    const matches = this.supplies().filter(supply =>
      (!term || supply.name.toLowerCase().includes(term)) &&
      (!soloBajos || this.isLowStock(supply))
    );

    const byCategory = new Map<string, Supply[]>();
    for (const supply of matches) {
      const name = this.categoryName(supply.categoryId);
      const items = byCategory.get(name);
      if (items) {
        items.push(supply);
      } else {
        byCategory.set(name, [supply]);
      }
    }

    return [...byCategory]
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  updateSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  clearSearch() {
    this.search.set('');
  }

  toggleBajoMinimo() {
    this.soloBajoMinimo.update(activo => !activo);
  }

  unitName(unitId: string): string {
    return getUnitName(this.unitsService.units(), unitId) || unitId;
  }

  /** Junto a una cantidad se lee mejor "25.000 g" que "25.000 Gramo". */
  unitAbbr(unitId: string): string {
    return getUnitAbbreviation(this.unitsService.units(), unitId) || this.unitName(unitId);
  }

  categoryName(categoryId: string): string {
    return this.categoriesService.categories().find(t => t.id === categoryId)?.name ?? 'Sin categoría';
  }

  /**
   * Lo que costaría una unidad de las que dice la etiqueta, si la etiqueta
   * fuera cierta. Sirve para decidir de un vistazo si lo es: si HARINA dice
   * Kilogramo y esto da $6, la etiqueta miente.
   */
  impliedCostPerLabeledUnit(supply: Supply): number {
    const unit = this.units().find(u => u.id === supply.unitId);
    return supply.unitCost * (describeUnit(unit)?.factor ?? 1);
  }

  isLowStock(supply: Supply): boolean {
    return supply.minStock !== undefined && supply.stock <= supply.minStock;
  }

  /**
   * Reconstruye cada saldo desde su historial y lo compara con el guardado.
   * El saldo denormalizado es la fuente de verdad, así que esto detecta que se
   * haya desincronizado; fue lo que delató las aperturas duplicadas.
   */
  runAudit() {
    const issues = this.inventoryService.auditAll()
      .filter(audit => !audit.ok)
      .map(audit => {
        const name = this.inventoryService.supplies().find(s => s.id === audit.supplyId)?.name
          ?? audit.supplyId;
        return `${name}: saldo ${audit.stored.stock} vs. ${audit.replayed.stock} según sus movimientos.`;
      });

    this.auditIssues.set(issues);
  }

  isExpanded(supplyId: string | undefined): boolean {
    return !!supplyId && this.expandedId() === supplyId;
  }

  /** Traduce lo que pide la fila a la operación correspondiente. */
  onAction(supply: Supply, accion: SupplyAction) {
    switch (accion) {
      case 'editar': return this.editSupply(supply);
      case 'eliminar': return this.deleteSupply(supply);
      default: return this.registerMovement(supply, accion);
    }
  }

  toggleMovements(supplyId: string | undefined) {
    if (!supplyId) return;
    this.expandedId.update(current => (current === supplyId ? null : supplyId));
  }

  addSupply() {
    const dialogRef = this.dialog.open(SupplyDialog, {
      width: '440px',
      data: { units: this.units(), categories: this.categories() }
    });

    dialogRef.afterClosed().subscribe(async (result: SupplyDialogResult | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        // Nace sin saldo: el costo lo fija la primera compra.
        await this.suppliesService.add({
          ...result,
          stock: 0,
          stockValue: 0,
          unitCost: 0,
          margin: DEFAULT_MARGIN
        });
      } catch (error) {
        console.error('Error adding supply:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  editSupply(supply: Supply) {
    const dialogRef = this.dialog.open(SupplyDialog, {
      width: '440px',
      data: { supply, units: this.units(), categories: this.categories() }
    });

    dialogRef.afterClosed().subscribe(async (result: SupplyDialogResult | undefined) => {
      if (!result || !supply.id) return;

      this.saving.set(true);
      try {
        // `balance` solo viene si se pidió convertir a la unidad nueva.
        const { balance, ...fields } = result;
        await this.suppliesService.update(supply.id, { ...supply, ...fields, ...balance });
      } catch (error) {
        console.error('Error updating supply:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  deleteSupply(supply: Supply) {
    if (!supply.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '440px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Eliminar "${supply.name}"? Las recetas que lo usen quedarán sin ese insumo. ` +
          `Sus movimientos históricos no se borran.`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;

      this.saving.set(true);
      try {
        await this.suppliesService.remove(supply.id!);
      } catch (error) {
        console.error('Error deleting supply:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }

  /** La operación se elige antes de abrir, así el formulario no cambia de forma. */
  registerMovement(supply: Supply, kind: MovementKind) {
    const dialogRef = this.dialog.open(MovementDialog, {
      width: '440px',
      maxHeight: '90vh',
      data: { kind, supply, unitName: this.unitName(supply.unitId), units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: MovementDialogResult | undefined) => {
      if (!result) return;

      this.saving.set(true);
      try {
        if (result.kind === 'ajuste') {
          await this.inventoryService.registerCount(
            supply, result.quantity, result.date, result.note
          );
        } else if (result.kind === 'entrada') {
          await this.inventoryService.registerPurchase(supply, {
            quantity: result.quantity,
            unitId: result.unitId,
            totalPaid: result.totalPaid,
            date: result.date,
            note: result.note
          });
        } else {
          await this.inventoryService.registerExit(
            supply, result.reason ?? 'otro', result.quantity, result.date, result.note
          );
        }
      } catch (error) {
        console.error('Error registering movement:', error);
      } finally {
        this.saving.set(false);
      }
    });
  }
}
