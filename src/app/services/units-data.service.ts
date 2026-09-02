import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Unit } from '../models/unit.model';

@Injectable({ providedIn: 'root' })
export class UnitsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('units').then(data => data as Unit[])
  });

  readonly units = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Unit): Promise<string> {
    const ref = await this.firestoreService.addDocument('units', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Unit): Promise<void> {
    await this.firestoreService.updateDocument('units', id, data);
    this._resource.update(list => list?.map(u => u.id === id ? { ...data, id } : u) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('units', id);
    this._resource.update(list => list?.filter(u => u.id !== id) ?? []);
  }
}
