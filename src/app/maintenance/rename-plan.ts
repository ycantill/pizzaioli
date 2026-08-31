import type { BatchOperation } from '../firestore.service';

export type RawDocument = Record<string, unknown> & { id?: string };

/**
 * Cómo renombrar un campo en una colección. El campo puede estar en la raíz
 * del documento o dentro de cada elemento de un arreglo.
 */
export type RenameSpec =
  | { collection: string; label: string; kind: 'field'; from: string; to: string }
  | { collection: string; label: string; kind: 'array'; arrayField: string; from: string; to: string };

export interface RenamePlan {
  spec: RenameSpec;
  operations: BatchOperation[];
  /** Documentos que todavía usan el nombre viejo. */
  pending: number;
  /** Documentos ya migrados. */
  done: number;
}

export const RENAME_SPECS: RenameSpec[] = [
  { collection: 'doughs', label: 'Masas', kind: 'array', arrayField: 'ingredients', from: 'costId', to: 'supplyId' },
  { collection: 'toppings', label: 'Toppings', kind: 'field', from: 'costId', to: 'supplyId' },
  { collection: 'packagings', label: 'Paquetería', kind: 'array', arrayField: 'items', from: 'costId', to: 'supplyId' },
  { collection: 'consumptions', label: 'Consumos', kind: 'field', from: 'costId', to: 'rateId' }
];

/**
 * Arma el renombrado de una colección.
 *
 * Solo toca los documentos que aún tienen el nombre viejo, así que se puede
 * reejecutar sin efecto. Para los campos de raíz se actualiza el campo nuevo y
 * se borra el viejo; para los arreglos se reescribe el arreglo completo,
 * porque Firestore no sabe borrar un campo dentro de un elemento.
 */
export function buildRenamePlan(spec: RenameSpec, documents: RawDocument[]): RenamePlan {
  const operations: BatchOperation[] = [];
  let pending = 0;
  let done = 0;

  for (const document of documents) {
    if (!document.id) continue;

    if (spec.kind === 'field') {
      if (document[spec.from] === undefined) {
        done++;
        continue;
      }

      pending++;
      operations.push({
        type: 'update',
        collection: spec.collection,
        id: document.id,
        data: { [spec.to]: document[spec.from] },
        deleteFields: [spec.from]
      });
      continue;
    }

    const items = document[spec.arrayField];
    if (!Array.isArray(items)) {
      done++;
      continue;
    }

    if (!items.some(item => isRecord(item) && item[spec.from] !== undefined)) {
      done++;
      continue;
    }

    pending++;
    operations.push({
      type: 'update',
      collection: spec.collection,
      id: document.id,
      data: { [spec.arrayField]: items.map(item => renameKey(item, spec.from, spec.to)) }
    });
  }

  return { spec, operations, pending, done };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Conserva cualquier otro campo del elemento: solo cambia la clave indicada. */
function renameKey(item: unknown, from: string, to: string): unknown {
  if (!isRecord(item) || item[from] === undefined) return item;

  const { [from]: value, ...rest } = item;
  return { ...rest, [to]: value };
}
