import { MarginConfig } from './margin-config.model';

/**
 * Insumo inventariable: ingredientes y paquetería.
 *
 * `stock`, `stockValue` y `unitCost` están denormalizados a propósito.
 * El costo unitario es el promedio ponderado (PPP) de las entradas, pero
 * recalcularlo exigiría leer toda la colección de entradas en cada carga,
 * así que se mantiene aquí y las entradas quedan como libro de auditoría.
 *
 * Invariante: unitCost === stockValue / stock (salvo stock 0, donde se
 * conserva el último PPP conocido).
 */
export interface Supply {
  id?: string;
  name: string;
  unitId: string;
  categoryId: string;
  stock: number;
  stockValue: number;
  unitCost: number;
  minStock?: number;
  margin: MarginConfig;
}
