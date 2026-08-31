import { Unit } from '../models/unit.model';

export type Dimension = 'weight' | 'volume' | 'count';

export interface UnitConversion {
  dimension: Dimension;
  /** Cuántas unidades base equivale una de esta unidad (gramo, mililitro o pieza). */
  factor: number;
}

const CONVERSIONS: Record<string, UnitConversion> = {
  mg: { dimension: 'weight', factor: 0.001 },
  g: { dimension: 'weight', factor: 1 },
  gr: { dimension: 'weight', factor: 1 },
  kg: { dimension: 'weight', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  cc: { dimension: 'volume', factor: 1 },
  l: { dimension: 'volume', factor: 1000 },
  lt: { dimension: 'volume', factor: 1000 },
  unidad: { dimension: 'count', factor: 1 },
  ud: { dimension: 'count', factor: 1 },
  u: { dimension: 'count', factor: 1 },
  pz: { dimension: 'count', factor: 1 }
};

/**
 * Describe una unidad, o undefined si no se reconoce.
 *
 * A propósito no hay valor por defecto: una unidad desconocida debe impedir
 * la conversión, no adivinarla. Convertir mal aquí multiplica o divide un
 * costo por mil.
 */
export function describeUnit(unit: Unit | undefined): UnitConversion | undefined {
  if (!unit) return undefined;
  return CONVERSIONS[unit.abbreviation.trim().toLowerCase()];
}

/**
 * Si la unidad es la base de su dimensión: gramo, mililitro o pieza.
 *
 * Importa porque las cantidades de las recetas están escritas en la unidad
 * base, y el costo se multiplica por ellas sin convertir. Un insumo cuya
 * unidad no sea la base tiene la etiqueta equivocada.
 */
export function isBaseUnit(unit: Unit | undefined): boolean {
  return describeUnit(unit)?.factor === 1;
}

/** Dos unidades son compatibles si miden lo mismo: peso con peso, volumen con volumen. */
export function areCompatible(a: Unit | undefined, b: Unit | undefined): boolean {
  const from = describeUnit(a);
  const to = describeUnit(b);
  return !!from && !!to && from.dimension === to.dimension;
}

/**
 * Convierte una cantidad entre unidades compatibles.
 * Devuelve undefined si no se puede convertir, para que el llamador decida.
 */
export function convert(quantity: number, from: Unit | undefined, to: Unit | undefined): number | undefined {
  const source = describeUnit(from);
  const target = describeUnit(to);

  if (!source || !target || source.dimension !== target.dimension) return undefined;

  return (quantity * source.factor) / target.factor;
}

/** Unidades a las que se puede convertir desde una dada, la propia incluida. */
export function compatibleUnits(units: Unit[], base: Unit | undefined): Unit[] {
  if (!describeUnit(base)) return base ? [base] : [];
  return units.filter(unit => areCompatible(unit, base));
}
