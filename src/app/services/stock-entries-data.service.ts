import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { StockEntry } from '../models/stock-entry.model';

/**
 * Compatibilidad con los movimientos anteriores a separar el motivo del tipo.
 * La merma era un `kind` propio; ahora es una salida con motivo, porque al
 * saldo le hace exactamente lo mismo que un consumo.
 *
 * Se puede borrar en cuanto no quede ningún documento con kind 'merma'. Sin
 * esto, replayEntries los tomaría por compras y la auditoría sumaría stock en
 * lugar de restarlo.
 */
export function normalizeEntry(entry: StockEntry): StockEntry {
  if ((entry.kind as string) !== 'merma') return entry;
  return { ...entry, kind: 'salida', reason: 'merma' };
}

@Injectable({ providedIn: 'root' })
export class StockEntriesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () =>
      this.firestoreService.getDocuments('stockEntries').then(data => (data as StockEntry[]).map(normalizeEntry))
  });

  readonly entries = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  /** Movimientos de un insumo, del más reciente al más antiguo. */
  entriesFor(supplyId: string): StockEntry[] {
    return this.entries()
      .filter(entry => entry.supplyId === supplyId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Registra en memoria una entrada ya escrita en el batch del InventoryService. */
  appendLocal(entry: StockEntry): void {
    this._resource.update(list => [...(list ?? []), entry]);
  }
}
