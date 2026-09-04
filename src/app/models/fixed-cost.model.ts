/**
 * Un gasto que se paga todos los meses, se venda o no: arriendo, salarios,
 * internet, depreciación del horno.
 *
 * No entra al costo de una unidad. Los fijos no los paga cada pizza por
 * separado sino el margen de contribución de todas juntas, así que lo que se
 * calcula con ellos no es un precio: es cuántas unidades hay que vender al mes
 * para cubrirlos. Ver `break-even.ts`.
 */
export interface FixedCost {
  id?: string;
  name: string;
  monthlyAmount: number;
}

export function totalMonthlyFixedCost(costs: FixedCost[]): number {
  return costs.reduce((sum, cost) => sum + cost.monthlyAmount, 0);
}
