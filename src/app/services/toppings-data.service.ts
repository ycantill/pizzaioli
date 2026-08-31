import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Topping } from '../models/topping.model';
import { normalizeTopping } from '../shared/legacy-fields';

@Injectable({ providedIn: 'root' })
export class ToppingsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('toppings').then(data => (data as Topping[]).map(normalizeTopping))
  });

  readonly toppings = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Topping): Promise<string> {
    const ref = await this.firestoreService.addDocument('toppings', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Topping): Promise<void> {
    await this.firestoreService.updateDocument('toppings', id, data);
    this._resource.update(list => list?.map(t => t.id === id ? { ...data, id } : t) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('toppings', id);
    this._resource.update(list => list?.filter(t => t.id !== id) ?? []);
  }
}
