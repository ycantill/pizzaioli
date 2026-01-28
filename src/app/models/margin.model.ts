export interface Margin {
  id?: string;
  costId: string;
  recoveryPercentage: number;      // % para recuperar inversión
  reinvestmentPercentage: number;  // % para reinversión
  profitPercentage: number;        // % para ganancia personal
}
