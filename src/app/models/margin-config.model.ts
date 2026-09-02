/**
 * Margen aplicado a un insumo o tarifa. Vive embebido dentro del documento
 * (antes era la colección `margins`, referenciada por costId).
 */
export interface MarginConfig {
  recoveryPercentage: number;      // % para recuperar inversión
  reinvestmentPercentage: number;  // % para reinversión
  profitPercentage: number;        // % para ganancia personal
}

export const DEFAULT_MARGIN: MarginConfig = {
  recoveryPercentage: 100,
  reinvestmentPercentage: 100,
  profitPercentage: 100
};
