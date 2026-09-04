import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { FixedCost } from '../models/fixed-cost.model';

@Injectable({ providedIn: 'root' })
export class FixedCostsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('fixedCosts').then(data => data as FixedCost[])
  });

  /** De mayor a menor: el gasto que más pesa se lee primero. */
  readonly fixedCosts = computed(() =>
    [...(this._resource.value() ?? [])].sort((a, b) => b.monthlyAmount - a.monthlyAmount)
  );
  readonly isLoading = this._resource.isLoading;

  async add(data: FixedCost): Promise<string> {
    const ref = await this.firestoreService.addDocument('fixedCosts', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: FixedCost): Promise<void> {
    await this.firestoreService.updateDocument('fixedCosts', id, data);
    this._resource.update(list => list?.map(c => c.id === id ? { ...data, id } : c) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('fixedCosts', id);
    this._resource.update(list => list?.filter(c => c.id !== id) ?? []);
  }
}
