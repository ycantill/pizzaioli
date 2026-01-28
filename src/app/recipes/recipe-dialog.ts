import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Recipe, RecipeIngredient } from '../models/recipe.model';
import { Cost } from '../models/cost.model';

export interface RecipeDialogData {
  recipe?: Recipe;
  costs: Cost[];
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

        <div class="ingredients-section">
          <div class="section-header">
            <h3>Ingredientes</h3>
            <button mat-icon-button type="button" (click)="addIngredient()" color="primary">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>

          <div formArrayName="ingredients" class="ingredients-list">
            @for (ingredient of ingredientsArray.controls; track $index) {
              <div [formGroupName]="$index" class="ingredient-row">
                <mat-form-field appearance="outline" class="cost-field">
                  <mat-label>Ingrediente</mat-label>
                  <mat-select formControlName="costId">
                    @for (cost of availableCosts($index); track cost.id) {
                      <mat-option [value]="cost.id">{{ cost.product }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="quantity-field">
                  <mat-label>Cantidad (g)</mat-label>
                  <input matInput type="number" formControlName="quantity">
                </mat-form-field>

                <button mat-icon-button type="button" color="warn" 
                        (click)="removeIngredient($index)"
                        [disabled]="ingredientsArray.length === 1">
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

    .checkbox-field {
      margin-bottom: 24px;
    }

    .checkbox-icon {
      margin-right: 8px;
      vertical-align: middle;
    }

    .ingredients-section {
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

    .ingredients-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
      padding: 4px;
    }

    .ingredient-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .cost-field {
      flex: 2;
      margin: 0;
    }

    .quantity-field {
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

      .ingredient-row {
        flex-wrap: wrap;
      }

      .cost-field,
      .quantity-field {
        flex: 1 1 100%;
      }
    }
  `]
})
export class RecipeDialog {
  data: RecipeDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RecipeDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.recipe?.name || '', Validators.required],
    ingredients: this.fb.array(
      this.data.recipe?.ingredients?.length 
        ? this.data.recipe.ingredients.map(ing => this.createIngredientGroup(ing))
        : [this.createIngredientGroup()]
    )
  });

  get ingredientsArray() {
    return this.form.get('ingredients') as FormArray;
  }

  createIngredientGroup(ingredient?: RecipeIngredient) {
    return this.fb.group({
      costId: [ingredient?.costId || this.data.costs[0]?.id || '', Validators.required],
      quantity: [ingredient?.quantity || 0, [Validators.required, Validators.min(1)]]
    });
  }

  availableCosts(currentIndex: number): Cost[] {
    const currentCostId = this.ingredientsArray.at(currentIndex).get('costId')?.value;
    const usedCostIds = this.ingredientsArray.controls
      .map((ctrl, idx) => idx !== currentIndex ? ctrl.get('costId')?.value : null)
      .filter(id => id !== null);
    
    return this.data.costs.filter(c => 
      c.id === currentCostId || !usedCostIds.includes(c.id)
    );
  }

  addIngredient() {
    const usedCostIds = this.ingredientsArray.controls.map(ctrl => ctrl.get('costId')?.value);
    const availableCost = this.data.costs.find(c => !usedCostIds.includes(c.id));
    
    if (availableCost) {
      this.ingredientsArray.push(this.createIngredientGroup({
        costId: availableCost.id!,
        quantity: 0
      }));
    }
  }

  removeIngredient(index: number) {
    if (this.ingredientsArray.length > 1) {
      this.ingredientsArray.removeAt(index);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const recipe: Recipe = {
        name: formValue.name!,
        ingredients: formValue.ingredients as RecipeIngredient[]
      };
      this.dialogRef.close(recipe);
    }
  }
}
