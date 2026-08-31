import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Packaging } from '../models/packaging.model';

@Injectable({ providedIn: 'root' })
export class PackagingsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('packagings').then(data => data as Packaging[])
  });

  readonly packagings = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Packaging): Promise<string> {
    const ref = await this.firestoreService.addDocument('packagings', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Packaging): Promise<void> {
    await this.firestoreService.updateDocument('packagings', id, data);
    this._resource.update(list => list?.map(p => p.id === id ? { ...data, id } : p) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('packagings', id);
    this._resource.update(list => list?.filter(p => p.id !== id) ?? []);
  }
}
