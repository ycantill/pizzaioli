/**
 * Un tamaño de una familia de productos: personal/mediana/familiar en la
 * pizza, 12/16/22 oz en el té. Cada tipo de receta tiene los suyos.
 *
 * El factor dice cuánto lleva ese tamaño respecto del base: la familiar con
 * 1,8 lleva 80 % más de lo que diga la receta. Antes esto era una tabla
 * clavada en la pantalla de venta —S 0,5 · M 1 · L 1,5— con geometría de
 * pizza, invisible y sin forma de editarla.
 */
export interface Size {
  id?: string;
  recipeTypeId: string;
  name: string;
  /** Cuánto lleva respecto del tamaño base. El base es 1. */
  factor: number;
}

/** El tamaño base, y lo que vale un precio que no declara ninguno. */
export const BASE_FACTOR = 1;

export function factorOf(size: Size | undefined): number {
  if (!size || !(size.factor > 0)) return BASE_FACTOR;
  return size.factor;
}

/** Los tamaños de una familia, del más chico al más grande. */
export function sizesOf(sizes: Size[], recipeTypeId: string | null | undefined): Size[] {
  if (!recipeTypeId) return [];
  return sizes
    .filter(size => size.recipeTypeId === recipeTypeId)
    .sort((a, b) => a.factor - b.factor);
}

/**
 * Elige la configuración que le toca a un tamaño.
 *
 * Busca primero la del tamaño concreto y cae en la que no declara ninguno, que
 * hace de valor por defecto. Así lo ya configurado —una sola paquetería por
 * tipo de receta, sin tamaños— sigue valiendo para todos.
 */
export function configFor<T extends { recipeTypeId: string; sizeId?: string }>(
  configs: T[],
  recipeTypeId: string | null | undefined,
  sizeId: string | null | undefined
): T | undefined {
  if (!recipeTypeId) return undefined;

  const ofType = configs.filter(config => config.recipeTypeId === recipeTypeId);
  return ofType.find(config => sizeId && config.sizeId === sizeId)
    ?? ofType.find(config => !config.sizeId);
}
