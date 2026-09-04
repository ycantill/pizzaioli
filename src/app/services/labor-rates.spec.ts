import { describe, expect, it } from 'vitest';
import { Consumption } from '../models/consumption.model';
import { DEFAULT_MARGIN } from '../models/margin-config.model';
import { Rate } from '../models/rate.model';
import { resolveLaborItem } from './labor-rates';

const GAS: Rate = {
  id: 'r1', name: 'Gas', unitId: 'm3', value: 3000, quantityPerHour: 2, margin: DEFAULT_MARGIN
};
const MANO_DE_OBRA: Rate = {
  id: 'r2', name: 'Mano de obra', unitId: 'h', value: 24000, margin: DEFAULT_MARGIN
};
const CONSUMO_VIEJO: Consumption = {
  id: 'c1', name: 'Horno', rateId: 'r1', quantity: 2.5
};

describe('resolveLaborItem', () => {
  it('resuelve contra la tarifa que apunta', () => {
    const resolved = resolveLaborItem(
      { rateId: 'r1', minutes: 30, batchSize: 4 }, [GAS], []
    );

    expect(resolved).toEqual({
      rateId: 'r1', name: 'Gas', quantityPerHour: 2, minutes: 30, batchSize: 4
    });
  });

  it('una tarifa sin ritmo declarado gasta una unidad por hora', () => {
    const resolved = resolveLaborItem({ rateId: 'r2', minutes: 30 }, [MANO_DE_OBRA], []);

    expect(resolved?.quantityPerHour).toBe(1);
    expect(resolved?.batchSize).toBe(1);
  });

  it('sigue leyendo las configuraciones viejas, que apuntaban a un consumo', () => {
    const resolved = resolveLaborItem(
      { consumptionId: 'c1', minutes: 30 }, [GAS], [CONSUMO_VIEJO]
    );

    // El ritmo y el nombre salen del consumo viejo, no de la tarifa.
    expect(resolved).toEqual({
      rateId: 'r1', name: 'Horno', quantityPerHour: 2.5, minutes: 30, batchSize: 1
    });
  });

  it('la forma nueva manda sobre la vieja si están las dos', () => {
    const resolved = resolveLaborItem(
      { rateId: 'r1', consumptionId: 'c1', minutes: 30 }, [GAS], [CONSUMO_VIEJO]
    );

    expect(resolved?.name).toBe('Gas');
  });

  it('sin tarifa que resolver, la línea no se cotiza', () => {
    expect(resolveLaborItem({ rateId: 'borrada', minutes: 30 }, [GAS], [])).toBeUndefined();
    expect(resolveLaborItem({ consumptionId: 'borrado', minutes: 30 }, [GAS], [])).toBeUndefined();
    expect(resolveLaborItem({ minutes: 30 }, [GAS], [])).toBeUndefined();
  });

  it('un consumo cuya tarifa ya no existe tampoco se cotiza', () => {
    expect(resolveLaborItem({ consumptionId: 'c1', minutes: 30 }, [], [CONSUMO_VIEJO]))
      .toBeUndefined();
  });
});
