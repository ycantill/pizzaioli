import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { CostType } from '../models/cost-type.model';

@Injectable({ providedIn: 'root' })
export class CostTypesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('cost-types').then(data => data as CostType[])
  });

  readonly costTypes = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: CostType): Promise<string> {
    const ref = await this.firestoreService.addDocument('cost-types', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: CostType): Promise<void> {
    await this.firestoreService.updateDocument('cost-types', id, data);
    this._resource.update(list => list?.map(t => t.id === id ? { ...data, id } : t) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('cost-types', id);
    this._resource.update(list => list?.filter(t => t.id !== id) ?? []);
  }
}
