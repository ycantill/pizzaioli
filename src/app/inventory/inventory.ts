import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EXIT_REASONS, ExitReason, StockEntry } from '../models/stock-entry.model';
import { Supply } from '../models/supply.model';
import { CatalogService } from '../services/catalog.service';
import { SupplyCategoriesDataService } from '../services/supply-categories-data.service';
import { InventoryService } from '../services/inventory.service';
import { SuppliesDataService } from '../services/supplies-data.service';
import { UnitsDataService } from '../services/units-data.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DEFAULT_MARGIN } from '../models/margin-config.model';
import { getUnitName } from '../shared/lookup.utils';
import { describeUnit } from '../services/unit-conversion';
import { MovementDialog, MovementDialogResult, MovementKind } from './movement-dialog';

function exitReasonLabel(reason: ExitReason | undefined): string {
  return EXIT_REASONS.find(r => r.value === reason)?.label ?? 'Salida';
}
import { SupplyDialog, SupplyDialogResult } from './supply-dialog';

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule
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

  readonly totalStockValue = this.inventoryService.totalStockValue;
  readonly lowStock = this.inventoryService.lowStockSupplies;
  readonly mislabeled = this.inventoryService.mislabeledUnits;
  readonly expandedId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly auditIssues = signal<string[] | null>(null);

  readonly displayedColumns = ['name', 'stock', 'unitCost', 'stockValue', 'actions'];

  readonly units = this.unitsService.units;
  readonly categories = this.catalog.supplyCategories;

  unitName(unitId: string): string {
    return getUnitName(this.unitsService.units(), unitId) || unitId;
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

  movementsFor(supplyId: string): StockEntry[] {
    return this.inventoryService.entriesFor(supplyId);
  }

  isExpanded(supplyId: string): boolean {
    return this.expandedId() === supplyId;
  }

  toggleMovements(supplyId: string | undefined) {
    if (!supplyId) return;
    this.expandedId.update(current => (current === supplyId ? null : supplyId));
  }

  /** En las salidas manda el motivo, que es lo que distingue una de otra. */
  movementLabel(entry: StockEntry): string {
    switch (entry.kind) {
      case 'apertura': return 'Apertura';
      case 'ajuste': return 'Conteo';
      case 'salida': return exitReasonLabel(entry.reason);
      default: return 'Compra';
    }
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
