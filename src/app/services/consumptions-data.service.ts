import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Consumption } from '../models/consumption.model';

@Injectable({ providedIn: 'root' })
export class ConsumptionsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('consumptions').then(data => data as Consumption[])
  });

  readonly consumptions = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Consumption): Promise<string> {
    const ref = await this.firestoreService.addDocument('consumptions', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Consumption): Promise<void> {
    await this.firestoreService.updateDocument('consumptions', id, data);
    this._resource.update(list => list?.map(c => c.id === id ? { ...data, id } : c) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('consumptions', id);
    this._resource.update(list => list?.filter(c => c.id !== id) ?? []);
  }
}
