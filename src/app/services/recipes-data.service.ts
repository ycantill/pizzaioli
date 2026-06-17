import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Recipe } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('recipes').then(data => data as Recipe[])
  });

  readonly recipes = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: Recipe): Promise<string> {
    const ref = await this.firestoreService.addDocument('recipes', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Recipe): Promise<void> {
    await this.firestoreService.updateDocument('recipes', id, data);
    this._resource.update(list => list?.map(r => r.id === id ? { ...data, id } : r) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('recipes', id);
    this._resource.update(list => list?.filter(r => r.id !== id) ?? []);
  }
}
