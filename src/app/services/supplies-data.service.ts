import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Supply } from '../models/supply.model';

@Injectable({ providedIn: 'root' })
export class SuppliesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('supplies').then(data => data as Supply[])
  });

  readonly supplies = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Supply): Promise<string> {
    const ref = await this.firestoreService.addDocument('supplies', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Supply): Promise<void> {
    await this.firestoreService.updateDocument('supplies', id, data);
    this._resource.update(list => list?.map(s => s.id === id ? { ...data, id } : s) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('supplies', id);
    this._resource.update(list => list?.filter(s => s.id !== id) ?? []);
  }

  /** Refleja en memoria una escritura hecha por fuera (por ejemplo, un batch). */
  patchLocal(id: string, data: Supply): void {
    this._resource.update(list => list?.map(s => s.id === id ? { ...data, id } : s) ?? []);
  }
}
