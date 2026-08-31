/**
 * Qué papel juega una categoría en el cálculo.
 *
 * Sustituye a la comparación por nombre (`name === 'ingrediente'`) que antes
 * decidía qué insumos ofrecer en masas y en paquetería, y que se rompía en
 * silencio al renombrar la categoría.
 */
export type CostTypeKind = 'ingrediente' | 'paqueteria';

export interface CostType {
  id?: string;
  name: string;
  /** Sin definir, se deduce del nombre por compatibilidad con los datos viejos. */
  kind?: CostTypeKind;
}
