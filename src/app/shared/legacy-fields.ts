import { Consumption } from '../models/consumption.model';
import { Dough } from '../models/dough.model';
import { Packaging } from '../models/packaging.model';
import { Topping } from '../models/topping.model';

/**
 * Compatibilidad con los documentos anteriores al renombre de `costId`.
 *
 * Cuando `costs` se partió en `supplies` y `rates`, el campo conservó su
 * nombre viejo para no tener que reescribir todos los documentos de golpe.
 * Estas funciones normalizan al leer, de modo que la app funciona igual con
 * documentos viejos y nuevos y la reescritura puede hacerse sin apuro.
 *
 * Se pueden borrar —junto con la página de mantenimiento— en cuanto ningún
 * documento tenga ya `costId`.
 */
/** El campo viejo ya no está en los tipos, así que se lee con un cast puntual. */
function resolveId(value: object, current: string | undefined): string {
  return current ?? (value as { costId?: string }).costId ?? '';
}

export function normalizeDough(dough: Dough): Dough {
  return {
    ...dough,
    ingredients: (dough.ingredients ?? []).map(ingredient => ({
      ...ingredient,
      supplyId: resolveId(ingredient, ingredient.supplyId)
    }))
  };
}

export function normalizeTopping(topping: Topping): Topping {
  return { ...topping, supplyId: resolveId(topping, topping.supplyId) };
}

export function normalizePackaging(packaging: Packaging): Packaging {
  return {
    ...packaging,
    items: (packaging.items ?? []).map(item => ({
      ...item,
      supplyId: resolveId(item, item.supplyId)
    }))
  };
}

export function normalizeConsumption(consumption: Consumption): Consumption {
  return { ...consumption, rateId: resolveId(consumption, consumption.rateId) };
}
