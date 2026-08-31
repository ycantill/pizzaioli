import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Dough } from '../models/dough.model';
import { normalizeDough } from '../shared/legacy-fields';

@Injectable({ providedIn: 'root' })
export class DoughsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('doughs').then(data => (data as Dough[]).map(normalizeDough))
  });

  readonly doughs = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Dough): Promise<string> {
    const ref = await this.firestoreService.addDocument('doughs', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Dough): Promise<void> {
    await this.firestoreService.updateDocument('doughs', id, data);
    this._resource.update(list => list?.map(d => d.id === id ? { ...data, id } : d) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('doughs', id);
    this._resource.update(list => list?.filter(d => d.id !== id) ?? []);
  }
}
