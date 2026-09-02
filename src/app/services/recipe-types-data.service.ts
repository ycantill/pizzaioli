import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { RecipeType } from '../models/recipe-type.model';

@Injectable({ providedIn: 'root' })
export class RecipeTypesDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments('recipe-types').then(data => data as RecipeType[])
  });

  readonly recipeTypes = computed(() => this._resource.value() ?? []);
  readonly isLoading = this._resource.isLoading;

  async add(data: RecipeType): Promise<string> {
    const ref = await this.firestoreService.addDocument('recipe-types', data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: RecipeType): Promise<void> {
    await this.firestoreService.updateDocument('recipe-types', id, data);
    this._resource.update(list => list?.map(t => t.id === id ? { ...data, id } : t) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('recipe-types', id);
    this._resource.update(list => list?.filter(t => t.id !== id) ?? []);
  }
}
