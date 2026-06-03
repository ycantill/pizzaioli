import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Recipe } from '../models/recipe.model';
import { Topping } from '../models/topping.model';
import { Cost } from '../models/cost.model';
import { RecipeType } from '../models/recipe-type.model';

export interface RecipeDialogData {
  recipe?: Recipe;
  toppings: Topping[];
  costs: Cost[];
  recipeTypes: RecipeType[];
}

@Component({
  selector: 'app-recipe-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.recipe ? 'Editar' : 'Nueva' }} Receta</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de la receta</mat-label>
          <input matInput formControlName="name" placeholder="Ej: Pizza Margherita">
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de Receta</mat-label>
          <mat-select formControlName="recipeTypeId">
            @for (type of data.recipeTypes; track type.id) {
              <mat-option [value]="type.id">{{ type.name }}</mat-option>
            }
          </mat-select>
          @if (form.get('recipeTypeId')?.hasError('required')) {
            <mat-error>El tipo de receta es requerido</mat-error>
          }
        </mat-form-field>

        <div class="toppings-section">
          <div class="section-header">
            <h3>Toppings</h3>
            <button mat-icon-button type="button" (click)="addTopping()" color="primary"
                    [disabled]="availableToppings(null).length === 0">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>

          <div formArrayName="toppings" class="toppings-list">
            @for (ctrl of toppingsArray.controls; track $index) {
              <div class="topping-row">
                <mat-form-field appearance="outline" class="topping-field">
                  <mat-label>Topping</mat-label>
                  <mat-select [formControlName]="$index">
                    @for (topping of availableToppings($index); track topping.id) {
                      <mat-option [value]="topping.id">{{ getToppingLabel(topping) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <button mat-icon-button type="button" color="warn"
                        (click)="removeTopping($index)">
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
        {{ data.recipe ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      padding-top: 20px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .toppings-section {
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

    .toppings-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
      padding: 4px;
    }

    .topping-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .topping-field {
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
    }
  `]
})
export class RecipeDialog {
  data: RecipeDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RecipeDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.recipe?.name ?? '', Validators.required],
    recipeTypeId: [this.data.recipe?.recipeTypeId ?? '', Validators.required],
    toppings: this.fb.array(
      this.data.recipe?.toppings?.length
        ? this.data.recipe.toppings.map(id => this.fb.control(id))
        : []
    )
  });

  get toppingsArray() {
    return this.form.get('toppings') as FormArray;
  }

  getToppingLabel(topping: Topping): string {
    const cost = this.data.costs.find(c => c.id === topping.costId);
    return `${cost?.product ?? 'Desconocido'} — ${topping.size} (${topping.quantity})`;
  }

  availableToppings(currentIndex: number | null): Topping[] {
    const usedIds = this.toppingsArray.controls
      .map((_, i) => i !== currentIndex ? this.toppingsArray.at(i).value as string : null)
      .filter((id): id is string => id !== null);
    const currentId = currentIndex !== null ? this.toppingsArray.at(currentIndex).value as string : null;
    return this.data.toppings.filter(t => t.id === currentId || !usedIds.includes(t.id!));
  }

  addTopping() {
    const usedIds = this.toppingsArray.controls.map(ctrl => ctrl.value as string);
    const next = this.data.toppings.find(t => !usedIds.includes(t.id!));
    if (next) {
      this.toppingsArray.push(this.fb.control(next.id!));
    }
  }

  removeTopping(index: number) {
    this.toppingsArray.removeAt(index);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const recipe: Recipe = {
        ...this.data.recipe,
        name: this.form.value.name!,
        recipeTypeId: this.form.value.recipeTypeId!,
        toppings: this.form.value.toppings as string[]
      };
      this.dialogRef.close(recipe);
    }
  }
}
