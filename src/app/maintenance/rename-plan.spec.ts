import { describe, expect, it } from 'vitest';
import { buildRenamePlan, RENAME_SPECS, RenameSpec } from './rename-plan';

const toppings = RENAME_SPECS.find(s => s.collection === 'toppings')!;
const doughs = RENAME_SPECS.find(s => s.collection === 'doughs')!;
const consumptions = RENAME_SPECS.find(s => s.collection === 'consumptions')!;

describe('buildRenamePlan sobre un campo de raíz', () => {
  it('mueve el valor al nombre nuevo y borra el viejo', () => {
    const plan = buildRenamePlan(toppings, [
      { id: 't1', costId: 'queso', quantity: 80, size: 'M' }
    ]);

    expect(plan.operations).toEqual([{
      type: 'update',
      collection: 'toppings',
      id: 't1',
      data: { supplyId: 'queso' },
      deleteFields: ['costId']
    }]);
    expect(plan.pending).toBe(1);
  });

  it('ignora los documentos ya migrados, así se puede reejecutar', () => {
    const plan = buildRenamePlan(toppings, [{ id: 't1', supplyId: 'queso', quantity: 80 }]);

    expect(plan.operations).toEqual([]);
    expect(plan.pending).toBe(0);
    expect(plan.done).toBe(1);
  });

  it('los consumos apuntan a tarifas, no a insumos', () => {
    const plan = buildRenamePlan(consumptions, [{ id: 'c1', costId: 'gas', quantity: 2 }]);

    expect(plan.operations[0].type === 'update' && plan.operations[0].data)
      .toEqual({ rateId: 'gas' });
  });
});

describe('buildRenamePlan sobre un arreglo', () => {
  it('reescribe el arreglo completo, porque Firestore no borra campos anidados', () => {
    const plan = buildRenamePlan(doughs, [{
      id: 'd1', name: 'Napolitana',
      ingredients: [{ costId: 'harina', quantity: 1000 }, { costId: 'sal', quantity: 20 }]
    }]);

    expect(plan.operations[0].type === 'update' && plan.operations[0].data).toEqual({
      ingredients: [{ supplyId: 'harina', quantity: 1000 }, { supplyId: 'sal', quantity: 20 }]
    });
  });

  it('conserva los demás campos de cada elemento', () => {
    const plan = buildRenamePlan(doughs, [{
      id: 'd1', ingredients: [{ costId: 'harina', quantity: 1000, nota: 'x' }]
    }]);

    expect(plan.operations[0].type === 'update' && plan.operations[0].data).toEqual({
      ingredients: [{ quantity: 1000, nota: 'x', supplyId: 'harina' }]
    });
  });

  it('migra un arreglo a medias sin duplicar lo ya hecho', () => {
    const plan = buildRenamePlan(doughs, [{
      id: 'd1', ingredients: [{ costId: 'harina', quantity: 1000 }, { supplyId: 'sal', quantity: 20 }]
    }]);

    expect(plan.operations[0].type === 'update' && plan.operations[0].data).toEqual({
      ingredients: [{ supplyId: 'harina', quantity: 1000 }, { supplyId: 'sal', quantity: 20 }]
    });
  });

  it('no toca un documento sin el arreglo', () => {
    expect(buildRenamePlan(doughs, [{ id: 'd1', name: 'X' }]).operations).toEqual([]);
  });

  it('cuenta pendientes y hechos por separado', () => {
    const plan = buildRenamePlan(doughs, [
      { id: 'd1', ingredients: [{ costId: 'harina', quantity: 1 }] },
      { id: 'd2', ingredients: [{ supplyId: 'harina', quantity: 1 }] }
    ]);

    expect(plan).toMatchObject({ pending: 1, done: 1 });
  });
});

describe('RENAME_SPECS', () => {
  it('cubre las cuatro colecciones que referenciaban costId', () => {
    expect(RENAME_SPECS.map((s: RenameSpec) => s.collection).sort())
      .toEqual(['consumptions', 'doughs', 'packagings', 'toppings']);
  });
});
