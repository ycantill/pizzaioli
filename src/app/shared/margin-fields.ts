import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DEFAULT_MARGIN, MarginConfig } from '../models/margin-config.model';

/**
 * El valor crudo del grupo anidado. Llega sin tipar —un FormGroup dentro de
 * otro pierde el tipo— así que se acepta suelto y se convierte al leerlo.
 */
export type MarginFormValue = Record<string, unknown>;

/** El grupo de campos del margen, para anidarlo en el formulario que lo edite. */
export function marginGroup(fb: FormBuilder, margin: MarginConfig | undefined): FormGroup {
  const value = margin ?? DEFAULT_MARGIN;

  return fb.nonNullable.group({
    recoveryPercentage: [value.recoveryPercentage, [Validators.required, Validators.min(0)]],
    reinvestmentPercentage: [value.reinvestmentPercentage, [Validators.required, Validators.min(0)]],
    profitPercentage: [value.profitPercentage, [Validators.required, Validators.min(0)]]
  });
}

export function marginFromForm(value: MarginFormValue): MarginConfig {
  return {
    recoveryPercentage: Number(value['recoveryPercentage']) || 0,
    reinvestmentPercentage: Number(value['reinvestmentPercentage']) || 0,
    profitPercentage: Number(value['profitPercentage']) || 0
  };
}

/**
 * Los tres porcentajes del margen, para editarlos donde vive el ítem.
 *
 * Antes eran una pantalla aparte, resto de cuando los márgenes fueron una
 * colección propia: para cambiarle el margen a la harina había que salir del
 * inventario e ir a buscarla a otra lista. El margen es un campo del insumo,
 * así que se edita con el insumo.
 */
@Component({
  selector: 'app-margin-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset class="margin-fields" [formGroup]="group()">
      <legend class="section-title">Margen</legend>
      <p class="section-note">
        Los tres se suman y multiplican el costo: 100 + 100 + 100 son 300 %, o sea que se cobra
        tres veces lo que costó. Por debajo de 100 % en total, se vende por menos de lo que cuesta.
      </p>

      <div class="margin-row">
        <label class="field">
          <span class="field-label">Recuperación</span>
          <span class="field-line">
            <input class="field-input" type="number" min="0" step="1" inputmode="numeric"
                   formControlName="recoveryPercentage">
            <span class="field-suffix">%</span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">Reinversión</span>
          <span class="field-line">
            <input class="field-input" type="number" min="0" step="1" inputmode="numeric"
                   formControlName="reinvestmentPercentage">
            <span class="field-suffix">%</span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">Ganancia</span>
          <span class="field-line">
            <input class="field-input" type="number" min="0" step="1" inputmode="numeric"
                   formControlName="profitPercentage">
            <span class="field-suffix">%</span>
          </span>
        </label>
      </div>

      <p class="margin-total" [class.is-below-cost]="total() < 100">
        <span>Margen total</span>
        <span class="margin-total-value">{{ total() }}%</span>
      </p>
      @if (total() < 100) {
        <p class="alert alert-warning">
          Con menos de 100 % el precio queda por debajo del costo.
        </p>
      }
    </fieldset>
  `,
  styles: `
    .margin-fields {
      margin: 20px 0 0;
      padding: 14px 0 0;
      border: none;
      border-top: 2px solid var(--app-rule-strong);
    }

    .section-title {
      padding: 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--app-ink-muted);
    }

    .section-note {
      margin: 4px 0 14px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--app-ink-muted);
    }

    /* Uno debajo de otro, como el resto del formulario. En tres columnas la
       etiqueta ("RECUPERACIÓN", en versalitas espaciadas) no cabe en 110px de
       un teléfono: se partía en dos líneas y descuadraba las tres cajas. */
    .margin-row .field:last-child {
      margin-bottom: 0;
    }

    .margin-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin: 14px 0 0;
      padding-top: 10px;
      border-top: 1px dotted var(--app-rule);
      font-size: 13px;
    }

    .margin-total-value {
      font-family: var(--app-mono);
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }

    .margin-total.is-below-cost .margin-total-value {
      color: var(--app-stamp);
    }

    /* El layout de la alerta lo pone cada componente; el color, la hoja compartida. */
    .alert {
      margin: 10px 0 0;
      padding: 8px 10px;
      border-left: 3px solid currentColor;
      font-size: 12px;
      line-height: 1.45;
    }
  `
})
export class MarginFields {
  readonly group = input.required<FormGroup>();
  /** Lo calcula quien ya escucha el formulario, para no suscribirse dos veces. */
  readonly total = input.required<number>();
}
