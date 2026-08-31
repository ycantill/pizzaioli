import { PricedItem } from '../models/priced-item.model';
import { Unit } from '../models/unit.model';

export function getItemName(items: PricedItem[], id: string, fallback = 'Desconocido'): string {
  return items.find(item => item.id === id)?.name ?? fallback;
}

export function getUnitName(units: Unit[], unitId: string): string {
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.name : '';
}
