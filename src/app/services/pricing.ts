import { MarginConfig } from '../models/margin-config.model';
import { PricedItem } from '../models/priced-item.model';

export interface CostLineItem {
  toppingId?: string;
  name: string;
  quantity: number;
  unitCost: number;
  baseCost: number;
  marginPercent: number;
  costWithMargin: number;
  roundedCost: number;
  isRecoveryOnly: boolean;
}

export interface LaborLineItem {
  name: string;
  hours: number;
  costPerHour: number;
  baseCost: number;
  marginPercent: number;
  costWithMargin: number;
  roundedCost: number;
  isRecoveryOnly: boolean;
}

export interface Subtotal {
  baseCost: number;
  costWithMargin: number;
  roundedCost: number;
}

/** Los costos con margen se redondean hacia arriba al siguiente múltiplo de 100. */
const ROUNDING_STEP = 100;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Los tres porcentajes se suman y actúan como multiplicador, no como recargo:
 * 100 + 100 + 100 da 300 %, o sea tres veces el costo base.
 */
export function marginPercent(margin: MarginConfig | undefined): number {
  if (!margin) return 0;
  return margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage;
}

/** Ítems que solo recuperan inversión: no cuentan como ganancia en los totales. */
export function isRecoveryOnly(margin: MarginConfig | undefined): boolean {
  return !!margin
    && margin.profitPercentage === 0
    && margin.reinvestmentPercentage === 0
    && margin.recoveryPercentage > 0;
}

export function buildLineItem(
  item: PricedItem,
  quantity: number,
  options: { name?: string; toppingId?: string } = {}
): CostLineItem {
  const totalMargin = marginPercent(item.margin);
  // El margen se aplica sobre el costo sin redondear; solo el resultado se redondea.
  const baseCost = quantity * item.unitCost;
  const costWithMargin = round2(baseCost * (totalMargin / 100));

  return {
    ...(options.toppingId ? { toppingId: options.toppingId } : {}),
    name: options.name ?? item.name,
    quantity: round2(quantity),
    unitCost: item.unitCost,
    baseCost: round2(baseCost),
    marginPercent: totalMargin,
    costWithMargin,
    roundedCost: Math.ceil(costWithMargin / ROUNDING_STEP) * ROUNDING_STEP,
    isRecoveryOnly: isRecoveryOnly(item.margin)
  };
}

/**
 * La mano de obra se cotiza distinto: la tarifa se consume a un ritmo por hora
 * (por ejemplo 2 m³ de gas por hora) durante una cantidad de minutos.
 */
export function buildLaborLineItem(
  name: string,
  item: PricedItem,
  quantityPerHour: number,
  minutes: number
): LaborLineItem {
  const totalMargin = marginPercent(item.margin);
  const hours = minutes / 60;
  const costPerHour = quantityPerHour * item.unitCost;
  const baseCost = hours * costPerHour;
  const costWithMargin = round2(baseCost * (totalMargin / 100));

  return {
    name,
    hours,
    costPerHour: round2(costPerHour),
    baseCost: round2(baseCost),
    marginPercent: totalMargin,
    costWithMargin,
    roundedCost: Math.ceil(costWithMargin / ROUNDING_STEP) * ROUNDING_STEP,
    isRecoveryOnly: isRecoveryOnly(item.margin)
  };
}

export function subtotal(items: (CostLineItem | LaborLineItem)[]): Subtotal {
  return {
    baseCost: round2(items.reduce((sum, item) => sum + item.baseCost, 0)),
    costWithMargin: round2(items.reduce((sum, item) => sum + item.costWithMargin, 0)),
    roundedCost: items.reduce((sum, item) => sum + item.roundedCost, 0)
  };
}

/** Los totales suman el costo ya redondeado de cada línea, no el crudo. */
export function totalRoundedCost(items: (CostLineItem | LaborLineItem)[]): number {
  return round2(items.reduce((sum, item) => sum + item.roundedCost, 0));
}

export function totalBaseCost(items: (CostLineItem | LaborLineItem)[]): number {
  return round2(items.reduce((sum, item) => sum + item.baseCost, 0));
}

export function totalCostWithMargin(items: (CostLineItem | LaborLineItem)[]): number {
  return round2(items.reduce((sum, item) => sum + item.costWithMargin, 0));
}

export function excludingRecovery<T extends { isRecoveryOnly: boolean }>(items: T[]): T[] {
  return items.filter(item => !item.isRecoveryOnly);
}
