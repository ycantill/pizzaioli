import { PricedItem } from '../models/priced-item.model';
import { Unit } from '../models/unit.model';

export function getItemName(items: PricedItem[], id: string, fallback = 'Desconocido'): string {
  return items.find(item => item.id === id)?.name ?? fallback;
}

export function getUnitName(units: Unit[], unitId: string): string {
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.name : '';
}

/** Abreviatura de la unidad ("g", "ml"), que es lo que se muestra junto a una cantidad. */
export function getUnitAbbreviation(units: Unit[], unitId: string): string {
  return units.find(u => u.id === unitId)?.abbreviation ?? '';
}
