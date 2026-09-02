import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Rate } from '../models/rate.model';

@Injectable({ providedIn: 'root' })
export class RatesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('rates').then(data => data as Rate[])
  });

  readonly rates = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Rate): Promise<string> {
    const ref = await this.firestoreService.addDocument('rates', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Rate): Promise<void> {
    await this.firestoreService.updateDocument('rates', id, data);
    this._resource.update(list => list?.map(r => r.id === id ? { ...data, id } : r) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('rates', id);
    this._resource.update(list => list?.filter(r => r.id !== id) ?? []);
  }
}
