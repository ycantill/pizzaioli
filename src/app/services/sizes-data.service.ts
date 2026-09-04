import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Size } from '../models/size.model';

@Injectable({ providedIn: 'root' })
export class SizesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('sizes').then(data => data as Size[])
  });

  readonly sizes = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  find(id: string | null | undefined): Size | undefined {
    return id ? this.sizes().find(s => s.id === id) : undefined;
  }

  async add(data: Size): Promise<string> {
    const ref = await this.firestoreService.addDocument('sizes', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Size): Promise<void> {
    await this.firestoreService.updateDocument('sizes', id, data);
    this._resource.update(list => list?.map(s => s.id === id ? { ...data, id } : s) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('sizes', id);
    this._resource.update(list => list?.filter(s => s.id !== id) ?? []);
  }
}
