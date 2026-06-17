import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Labor } from '../models/labor.model';

@Injectable({ providedIn: 'root' })
export class LaborsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('labors').then(data => data as Labor[])
  });

  readonly labors = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Labor): Promise<string> {
    const ref = await this.firestoreService.addDocument('labors', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Labor): Promise<void> {
    await this.firestoreService.updateDocument('labors', id, data);
    this._resource.update(list => list?.map(l => l.id === id ? { ...data, id } : l) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('labors', id);
    this._resource.update(list => list?.filter(l => l.id !== id) ?? []);
  }
}
