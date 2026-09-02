/**
 * Qué papel juega una categoría en el cálculo.
 *
 * Sustituye a la comparación por nombre (`name === 'ingrediente'`) que antes
 * decidía qué insumos ofrecer en masas y en paquetería, y que se rompía en
 * silencio al renombrar la categoría.
 */
export type SupplyCategoryKind = 'ingrediente' | 'paqueteria';

export interface SupplyCategory {
  id?: string;
  name: string;
  /** Sin definir, se deduce del nombre por compatibilidad con los datos viejos. */
  kind?: SupplyCategoryKind;
}
