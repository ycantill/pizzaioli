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
  templateUrl: './recipe-dialog.html',
  styleUrl: './recipe-dialog.css'
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
