import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Preparation } from '../models/preparation.model';

/**
 * La colección se sigue llamando `doughs` porque ahí están las masas ya
 * cargadas y los precios las referencian por id. Renombrarla obligaría a
 * migrar los precios, y el nombre no se ve desde ninguna pantalla.
 */
const COLLECTION = 'doughs';

@Injectable({ providedIn: 'root' })
export class PreparationsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments(COLLECTION).then(data => data as Preparation[])
  });

  readonly preparations = computed(() =>
    [...(this._resource.value() ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  );
  readonly isLoading = this._resource.isLoading;

  find(id: string | undefined): Preparation | undefined {
    return id ? this.preparations().find(p => p.id === id) : undefined;
  }

  async add(data: Preparation): Promise<string> {
    const ref = await this.firestoreService.addDocument(COLLECTION, data);
    this._resource.update(list => [...(list ?? []), { ...data, id: ref.id }]);
    return ref.id;
  }

  async update(id: string, data: Preparation): Promise<void> {
    await this.firestoreService.updateDocument(COLLECTION, id, data);
    this._resource.update(list => list?.map(p => p.id === id ? { ...data, id } : p) ?? []);
  }

  async remove(id: string): Promise<void> {
    await this.firestoreService.deleteDocument(COLLECTION, id);
    this._resource.update(list => list?.filter(p => p.id !== id) ?? []);
  }
}
