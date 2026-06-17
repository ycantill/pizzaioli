import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';

export function getCostName(costs: Cost[], costId: string, fallback = 'Desconocido'): string {
  const cost = costs.find(c => c.id === costId);
  return cost ? cost.product : fallback;
}

export function getUnitName(units: Unit[], unitId: string): string {
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.name : '';
}
