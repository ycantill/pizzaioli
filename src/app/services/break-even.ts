/**
 * Punto de equilibrio: cuántas unidades hay que vender al mes para cubrir los
 * costos fijos.
 *
 * Los fijos no se reparten dentro del precio de cada unidad. Lo que paga el
 * arriendo es el margen de contribución —lo que deja cada venta una vez pagado
 * lo que costó producirla—, así que la pregunta no es "cuánto arriendo lleva
 * esta pizza" sino "cuántas pizzas hacen falta".
 */

export interface ProductContribution {
  recipeTypeId: string | null;
  /** Nombre del tipo de receta, para mostrar la línea. */
  name: string;
  /** Precio menos costo variable, por unidad. */
  contribution: number;
  /** Minutos de cocina que ocupa una unidad. */
  productionMinutes: number;
}

export interface BreakEvenLine {
  recipeTypeId: string | null;
  name: string;
  contribution: number;
  productionMinutes: number;
  /** Parte del gasto mensual que carga este tipo, de 0 a 1. */
  share: number;
  assignedFixedCost: number;
  /** Unidades al mes para cubrir su parte, si se vende la mezcla prevista. */
  unitsPerMonth: number;
  unitsPerDay: number;
  /** Unidades al mes si no se vendiera nada más que esto. */
  unitsAlone: number;
  /** Una contribución de cero o negativa no cubre nada, se vendan las que se vendan. */
  viable: boolean;
}

export interface BreakEven {
  monthlyFixedCost: number;
  lines: BreakEvenLine[];
  /** Contribución media de la mezcla, ponderada por las unidades de cada línea. */
  averageContribution: number;
  totalUnitsPerMonth: number;
  totalUnitsPerDay: number;
  /** Falso si algún producto no aporta nada: entonces el equilibrio no existe. */
  viable: boolean;
}

/**
 * Reparte el gasto del mes entre tipos de receta según los minutos de cocina
 * que ocupa cada unidad.
 *
 * Es un reparto, no una ley: quien ocupa el horno el doble de tiempo carga con
 * el doble de arriendo. Sin mano de obra configurada no hay con qué ponderar y
 * se reparte por igual, que es mejor que dejar tipos en cero.
 */
export function breakEven(
  monthlyFixedCost: number,
  products: ProductContribution[],
  operatingDaysPerMonth: number
): BreakEven {
  const days = operatingDaysPerMonth > 0 ? operatingDaysPerMonth : 30;

  if (products.length === 0) {
    return {
      monthlyFixedCost,
      lines: [],
      averageContribution: 0,
      totalUnitsPerMonth: 0,
      totalUnitsPerDay: 0,
      viable: false
    };
  }

  const totalMinutes = products.reduce((sum, product) => sum + product.productionMinutes, 0);

  const lines = products.map<BreakEvenLine>(product => {
    const share = totalMinutes > 0
      ? product.productionMinutes / totalMinutes
      : 1 / products.length;
    const assignedFixedCost = round2(monthlyFixedCost * share);
    const viable = product.contribution > 0;

    return {
      recipeTypeId: product.recipeTypeId,
      name: product.name,
      contribution: product.contribution,
      productionMinutes: product.productionMinutes,
      share,
      assignedFixedCost,
      // Media unidad no se vende: el equilibrio se alcanza en la siguiente entera.
      unitsPerMonth: viable ? Math.ceil(assignedFixedCost / product.contribution) : 0,
      unitsPerDay: viable ? Math.ceil(assignedFixedCost / product.contribution / days) : 0,
      unitsAlone: viable ? Math.ceil(monthlyFixedCost / product.contribution) : 0,
      viable
    };
  });

  const totalUnitsPerMonth = lines.reduce((sum, line) => sum + line.unitsPerMonth, 0);

  return {
    monthlyFixedCost,
    lines,
    averageContribution: totalUnitsPerMonth > 0
      ? round2(monthlyFixedCost / totalUnitsPerMonth)
      : 0,
    totalUnitsPerMonth,
    totalUnitsPerDay: Math.ceil(totalUnitsPerMonth / days),
    viable: lines.every(line => line.viable)
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;
