import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Margin } from '../models/margin.model';

@Injectable({ providedIn: 'root' })
export class MarginsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('margins').then(data => data as Margin[])
  });

  readonly margins = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Margin): Promise<string> {
    const ref = await this.firestoreService.addDocument('margins', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Margin): Promise<void> {
    await this.firestoreService.updateDocument('margins', id, data);
    this._resource.update(list => list?.map(m => m.id === id ? { ...data, id } : m) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('margins', id);
    this._resource.update(list => list?.filter(m => m.id !== id) ?? []);
  }
}
