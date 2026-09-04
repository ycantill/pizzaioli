import { describe, expect, it } from 'vitest';
import { batchSizeOf, minutesPerUnit } from './labor.model';

describe('batchSizeOf', () => {
  it('una configuración vieja, sin tanda, rinde una unidad', () => {
    expect(batchSizeOf({ consumptionId: 'c1', minutes: 30 })).toBe(1);
  });

  it('una tanda de cero o negativa no divide', () => {
    expect(batchSizeOf({ consumptionId: 'c1', minutes: 30, batchSize: 0 })).toBe(1);
    expect(batchSizeOf({ consumptionId: 'c1', minutes: 30, batchSize: -4 })).toBe(1);
  });

  it('respeta la tanda configurada', () => {
    expect(batchSizeOf({ consumptionId: 'c1', minutes: 30, batchSize: 4 })).toBe(4);
  });
});

describe('minutesPerUnit', () => {
  it('reparte los minutos de la tanda entre lo que rinde', () => {
    expect(minutesPerUnit({ consumptionId: 'c1', minutes: 30, batchSize: 4 })).toBe(7.5);
  });

  it('sin tanda, los minutos son los de la unidad', () => {
    expect(minutesPerUnit({ consumptionId: 'c1', minutes: 30 })).toBe(30);
  });
});
