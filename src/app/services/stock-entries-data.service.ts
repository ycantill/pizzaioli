import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { StockEntry } from '../models/stock-entry.model';

@Injectable({ providedIn: 'root' })
export class StockEntriesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () =>
      this.firestoreService.getDocuments('stockEntries').then(data => data as StockEntry[])
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
