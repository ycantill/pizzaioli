import { describe, expect, it } from 'vitest';
import { formatMinutes } from './format.utils';

describe('formatMinutes', () => {
  it('separa horas y minutos', () => {
    expect(formatMinutes(90)).toBe('1h 30min');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(45)).toBe('45min');
    expect(formatMinutes(0)).toBe('0min');
  });

  it('redondea los minutos partidos de una tanda', () => {
    expect(formatMinutes(30 / 4)).toBe('8min');
    expect(formatMinutes(0.4)).toBe('0min');
  });
});
