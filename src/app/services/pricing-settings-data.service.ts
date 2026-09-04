import { Injectable, inject, resource, computed } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { DEFAULT_PRICING_SETTINGS, PricingSettings } from '../models/pricing-settings.model';

/**
 * Los ajustes son un único documento de id conocido, no una colección de la
 * que se creen y borren cosas. Por eso se escribe con `set` sobre ese id: la
 * primera vez lo crea y las siguientes lo reemplaza, sin tener que saber si
 * ya existía.
 */
const SETTINGS_COLLECTION = 'settings';
const PRICING_DOC_ID = 'pricing';

@Injectable({ providedIn: 'root' })
export class PricingSettingsDataService {
  private firestoreService = inject(FirestoreService);

  private _resource = resource({
    loader: () => this.firestoreService.getDocuments(SETTINGS_COLLECTION)
      .then(data => data as (PricingSettings & { id: string })[])
  });

  /** Sin documento guardado valen los valores por defecto, no cero. */
  readonly settings = computed<PricingSettings>(() => {
    const stored = this._resource.value()?.find(doc => doc.id === PRICING_DOC_ID);
    if (!stored) return DEFAULT_PRICING_SETTINGS;

    return {
      operatingDaysPerMonth:
        stored.operatingDaysPerMonth ?? DEFAULT_PRICING_SETTINGS.operatingDaysPerMonth
    };
  });

  readonly isLoading = this._resource.isLoading;

  /**
   * Guarda solo los campos que se pasan, sobre los vigentes: si mañana otra
   * pantalla ajusta otro campo de este documento, un `set` con la mitad de los
   * campos no borrará la otra mitad.
   */
  async save(changes: Partial<PricingSettings>): Promise<void> {
    const settings: PricingSettings = { ...this.settings(), ...changes };

    await this.firestoreService.commitBatch([
      { type: 'set', collection: SETTINGS_COLLECTION, id: PRICING_DOC_ID, data: settings }
    ]);

    this._resource.update(list => {
      const others = (list ?? []).filter(doc => doc.id !== PRICING_DOC_ID);
      return [...others, { ...settings, id: PRICING_DOC_ID }];
    });
  }
}
