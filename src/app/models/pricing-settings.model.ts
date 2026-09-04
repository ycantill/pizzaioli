/**
 * Ajustes que valen para todos los cálculos. Vive en un único documento,
 * `settings/pricing`: no es una colección de la que se creen y borren cosas.
 */
export interface PricingSettings {
  /** Días que se abre al mes. Convierte el equilibrio mensual en uno diario. */
  operatingDaysPerMonth: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  operatingDaysPerMonth: 30
};
