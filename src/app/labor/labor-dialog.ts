import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Labor, LaborItem } from '../models/labor.model';
import { RecipeType } from '../models/recipe-type.model';
import { Consumption } from '../models/consumption.model';
import { Cost } from '../models/cost.model';

export interface LaborDialogData {
  labor?: Labor;
  recipeType: RecipeType;
  consumptions: Consumption[];
  costs: Cost[];
}

@Component({
  selector: 'app-labor-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Mano de Obra - {{ data.recipeType.name }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="items-section">
          <div class="section-header">
            <h3>Consumos</h3>
            <button mat-icon-button type="button" (click)="addItem()" color="primary">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>

          <div formArrayName="items" class="items-list">
            @for (item of itemsArray.controls; track $index) {
              <div [formGroupName]="$index" class="item-row">
                <mat-form-field appearance="outline" class="consumption-field">
                  <mat-label>Consumo</mat-label>
                  <mat-select formControlName="consumptionId">
                    @for (consumption of availableConsumptions($index); track consumption.id) {
                      <mat-option [value]="consumption.id">{{ consumption.name }} ({{ getCostName(consumption.costId) }})</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="time-field">
                  <mat-label>Horas</mat-label>
                  <input matInput type="number" formControlName="hours" min="0">
                </mat-form-field>

                <mat-form-field appearance="outline" class="time-field">
                  <mat-label>Minutos</mat-label>
                  <input matInput type="number" formControlName="minutes" min="0" max="59">
                </mat-form-field>

                <button mat-icon-button type="button" color="warn"
                        (click)="removeItem($index)"
                        [disabled]="itemsArray.length === 1">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary"
              (click)="onSave()"
              [disabled]="!form.valid">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      padding-top: 20px;
    }

    .items-section {
      margin-top: 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 1rem;
      color: #666;
      font-weight: 500;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
      padding: 4px;
    }

    .item-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .consumption-field {
      flex: 3;
      margin: 0;
    }

    .time-field {
      flex: 1;
      margin: 0;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }

    @media (max-width: 600px) {
      mat-dialog-content {
        min-width: auto;
      }

      .item-row {
        flex-wrap: wrap;
      }

      .consumption-field {
        flex: 1 1 100%;
      }

      .time-field {
        flex: 1 1 40%;
      }
    }
  `]
})
export class LaborDialog {
  data: LaborDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<LaborDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    items: this.fb.array(
      this.data.labor?.items?.length
        ? this.data.labor.items.map(item => this.createItemGroup(item))
        : [this.createItemGroup()]
    )
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  createItemGroup(item?: LaborItem) {
    const hours = item ? Math.floor(item.minutes / 60) : 0;
    const minutes = item ? item.minutes % 60 : 0;

    return this.fb.group({
      consumptionId: [item?.consumptionId || this.data.consumptions[0]?.id || '', Validators.required],
      hours: [hours, [Validators.required, Validators.min(0)]],
      minutes: [minutes, [Validators.required, Validators.min(0), Validators.max(59)]]
    });
  }

  getCostName(costId: string): string {
    const cost = this.data.costs.find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  availableConsumptions(currentIndex: number): Consumption[] {
    const currentId = this.itemsArray.at(currentIndex).get('consumptionId')?.value;
    const usedIds = this.itemsArray.controls
      .map((ctrl, idx) => idx !== currentIndex ? ctrl.get('consumptionId')?.value : null)
      .filter(id => id !== null);

    return this.data.consumptions.filter(c =>
      c.id === currentId || !usedIds.includes(c.id)
    );
  }

  addItem() {
    const usedIds = this.itemsArray.controls.map(ctrl => ctrl.get('consumptionId')?.value);
    const available = this.data.consumptions.find(c => !usedIds.includes(c.id));

    if (available) {
      this.itemsArray.push(this.createItemGroup({
        consumptionId: available.id!,
        minutes: 0
      }));
    }
  }

  removeItem(index: number) {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const items: LaborItem[] = (formValue.items as Array<{ consumptionId: string; hours: number; minutes: number }>)
        .map(item => ({
          consumptionId: item.consumptionId,
          minutes: (item.hours * 60) + item.minutes
        }))
        .filter(item => item.minutes > 0);

      if (items.length === 0) return;

      const labor: Labor = {
        recipeTypeId: this.data.recipeType.id!,
        items
      };
      this.dialogRef.close(labor);
    }
  }
}
