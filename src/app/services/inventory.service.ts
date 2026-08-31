import { Injectable, computed, inject } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { ExitReason, StockEntry, StockEntryKind } from '../models/stock-entry.model';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';
import { SuppliesDataService } from './supplies-data.service';
import { StockEntriesDataService } from './stock-entries-data.service';
import { UnitsDataService } from './units-data.service';
import { convert, isBaseUnit } from './unit-conversion';
import {
  applyCount,
  applyEntry,
  applyExit,
  entryUnitCost,
  replayEntries,
  shortfall,
  StockBalance
} from './weighted-average';

export interface PurchaseInput {
  /** En la unidad de compra, que puede no ser la unidad base del insumo. */
  quantity: number;
  unitId: string;
  totalPaid: number;
  date: string;
  note?: string;
}

export interface PurchasePreview {
  /** Cantidad ya convertida a la unidad base del insumo. */
  baseQuantity: number;
  entryUnitCost: number;
  balance: StockBalance;
  /** Diferencia contra el PPP actual; es lo que moverá los precios. */
  unitCostDelta: number;
  /**
   * El nuevo PPP se sale de escala frente al actual. Casi siempre significa
   * que la unidad de compra no es la que se creía.
   */
  suspiciousUnitCost: boolean;
}

export interface SupplyAudit {
  supplyId: string;
  stored: StockBalance;
  replayed: StockBalance;
  ok: boolean;
}

const EPSILON = 1e-6;

/** Un PPP que cambia más de 100 veces casi siempre es un error de unidad. */
const SCALE_ALARM = 100;

function isOutOfScale(current: number, next: number): boolean {
  if (current <= 0 || next <= 0) return false;
  const ratio = next > current ? next / current : current / next;
  return ratio >= SCALE_ALARM;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private firestoreService = inject(FirestoreService);
  private suppliesService = inject(SuppliesDataService);
  private stockEntriesService = inject(StockEntriesDataService);
  private unitsService = inject(UnitsDataService);

  readonly supplies = this.suppliesService.supplies;
  readonly isLoading = computed(() =>
    this.suppliesService.isLoading() || this.stockEntriesService.isLoading()
  );

  readonly totalStockValue = computed(() =>
    this.supplies().reduce((sum, supply) => sum + supply.stockValue, 0)
  );

  /**
   * Insumos cuya unidad no es la base de su dimensión.
   *
   * El costo unitario ya está en unidad base —si no, los precios no darían—,
   * así que estos tienen la etiqueta mal puesta. Corregirla no cambia ningún
   * precio, pero sin corregirla una compra en kilos se registra mil veces mal.
   */
  readonly mislabeledUnits = computed(() =>
    this.supplies().filter(supply => {
      const unit = this.unit(supply.unitId);
      return unit !== undefined && !isBaseUnit(unit);
    })
  );

  readonly lowStockSupplies = computed(() =>
    this.supplies().filter(s => s.minStock !== undefined && s.stock <= s.minStock)
  );

  private unit(unitId: string): Unit | undefined {
    return this.unitsService.units().find(u => u.id === unitId);
  }

  /**
   * Pasa una cantidad a la unidad base del insumo. Si las unidades coinciden
   * no hay nada que convertir, aunque la unidad no esté en la tabla.
   */
  toBaseQuantity(supply: Supply, quantity: number, unitId: string): number | undefined {
    if (unitId === supply.unitId) return quantity;
    return convert(quantity, this.unit(unitId), this.unit(supply.unitId));
  }

  entriesFor(supplyId: string): StockEntry[] {
    return this.stockEntriesService.entriesFor(supplyId);
  }

  balanceOf(supply: Supply): StockBalance {
    return { stock: supply.stock, stockValue: supply.stockValue, unitCost: supply.unitCost };
  }

  /** Simula una compra sin escribir nada, para mostrarla en vivo en el formulario. */
  previewPurchase(
    supply: Supply,
    quantity: number,
    totalPaid: number,
    unitId = supply.unitId
  ): PurchasePreview {
    const baseQuantity = this.toBaseQuantity(supply, quantity, unitId) ?? 0;
    const balance = applyEntry(this.balanceOf(supply), baseQuantity, totalPaid);

    return {
      baseQuantity,
      entryUnitCost: entryUnitCost(baseQuantity, totalPaid),
      balance,
      unitCostDelta: balance.unitCost - supply.unitCost,
      suspiciousUnitCost: isOutOfScale(supply.unitCost, balance.unitCost)
    };
  }

  /** Cuánto de una salida no alcanza a cubrirse con el stock disponible. */
  shortfallFor(supply: Supply, quantity: number): number {
    return shortfall(this.balanceOf(supply), quantity);
  }

  /** Registra una compra. La entrada y el nuevo saldo se escriben en un solo batch. */
  async registerPurchase(supply: Supply, input: PurchaseInput): Promise<void> {
    const baseQuantity = this.toBaseQuantity(supply, input.quantity, input.unitId);
    if (baseQuantity === undefined) {
      throw new Error('No se puede convertir la unidad de compra a la unidad del insumo.');
    }

    const balance = applyEntry(this.balanceOf(supply), baseQuantity, input.totalPaid);

    await this.writeMovement(supply, balance, {
      kind: 'entrada',
      quantity: baseQuantity,
      totalPaid: input.totalPaid,
      unitCost: entryUnitCost(baseQuantity, input.totalPaid),
      date: input.date,
      note: input.note
    });
  }

  /**
   * Registra una salida. El motivo no altera el saldo —producción y merma
   * restan igual— pero queda guardado para poder medir cada uno.
   */
  async registerExit(
    supply: Supply,
    reason: ExitReason,
    quantity: number,
    date: string,
    note?: string
  ): Promise<void> {
    const balance = applyExit(this.balanceOf(supply), quantity);

    await this.writeMovement(supply, balance, {
      kind: 'salida',
      reason,
      quantity,
      totalPaid: 0,
      unitCost: supply.unitCost,
      date,
      note
    });
  }

  /**
   * Registra un conteo físico. Corrige la cantidad conservando el costo
   * unitario, así que nunca mueve los precios de venta.
   */
  async registerCount(
    supply: Supply,
    countedQuantity: number,
    date: string,
    note?: string
  ): Promise<void> {
    const balance = applyCount(this.balanceOf(supply), countedQuantity);

    await this.writeMovement(supply, balance, {
      kind: 'ajuste',
      quantity: countedQuantity,
      totalPaid: 0,
      unitCost: supply.unitCost,
      date,
      note
    });
  }

  /**
   * Contrasta el saldo denormalizado contra el historial completo. El saldo
   * guardado es la fuente de verdad en la app; esto sirve para detectar que se
   * haya desincronizado (por ejemplo, si un batch quedó a medias).
   */
  auditSupply(supply: Supply): SupplyAudit {
    const stored = this.balanceOf(supply);
    const replayed = replayEntries(this.entriesFor(supply.id!));

    return {
      supplyId: supply.id!,
      stored,
      replayed,
      ok: Math.abs(stored.stock - replayed.stock) < EPSILON
        && Math.abs(stored.stockValue - replayed.stockValue) < EPSILON
    };
  }

  auditAll(): SupplyAudit[] {
    return this.supplies().filter(s => s.id).map(supply => this.auditSupply(supply));
  }

  private async writeMovement(
    supply: Supply,
    balance: StockBalance,
    movement: {
      kind: StockEntryKind;
      reason?: ExitReason;
      quantity: number;
      totalPaid: number;
      unitCost: number;
      date: string;
      note?: string;
    }
  ): Promise<void> {
    if (!supply.id) throw new Error('El insumo no tiene id.');

    const entryId = this.firestoreService.newId('stockEntries');
    const entry: StockEntry = {
      supplyId: supply.id,
      date: movement.date,
      kind: movement.kind,
      ...(movement.reason ? { reason: movement.reason } : {}),
      quantity: movement.quantity,
      unitId: supply.unitId,
      totalPaid: movement.totalPaid,
      unitCost: movement.unitCost,
      ...(movement.note ? { note: movement.note } : {})
    };

    const updated: Supply = { ...supply, ...balance };

    await this.firestoreService.commitBatch([
      { type: 'set', collection: 'stockEntries', id: entryId, data: entry },
      { type: 'update', collection: 'supplies', id: supply.id, data: balance }
    ]);

    this.stockEntriesService.appendLocal({ ...entry, id: entryId });
    this.suppliesService.patchLocal(supply.id, updated);
  }
}
