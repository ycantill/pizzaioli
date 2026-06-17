import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Cost } from '../models/cost.model';

@Injectable({ providedIn: 'root' })
export class CostsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('costs').then(data => data as Cost[])
  });

  readonly costs = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Cost): Promise<string> {
    const ref = await this.firestoreService.addDocument('costs', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Cost): Promise<void> {
    await this.firestoreService.updateDocument('costs', id, data);
    this._resource.update(list => list?.map(c => c.id === id ? { ...data, id } : c) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('costs', id);
    this._resource.update(list => list?.filter(c => c.id !== id) ?? []);
  }
}
