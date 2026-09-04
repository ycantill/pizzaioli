/**
 * Lo que queda del modelo de masa: los tipos de la calculadora de panadería.
 *
 * Las masas en sí pasaron a ser preparaciones —cualquier cosa que se hace
 * aparte y se consume por partes—, en `preparation.model.ts`. Esto es solo la
 * fila editable de la calculadora, que trabaja en porcentaje panadero.
 */
export interface DoughIngredient {
  id?: string;
  supplyId: string;
  bakerPercentage: number;
  calculatedWeight?: number;
}
