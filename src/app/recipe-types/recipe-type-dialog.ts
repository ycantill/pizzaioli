import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RecipeType } from '../models/recipe-type.model';
import { Size } from '../models/size.model';

export interface RecipeTypeDialogData {
  recipeType?: RecipeType;
  sizes: Size[];
}

export interface RecipeTypeDialogResult {
  name: string;
  /** Los tamaños tal como quedaron: los que traen id se actualizan, el resto nacen. */
  sizes: { id?: string; name: string; factor: number }[];
}

@Component({
  selector: 'app-recipe-type-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './recipe-type-dialog.html',
  styleUrl: './recipe-type-dialog.css'
})
export class RecipeTypeDialog {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<RecipeTypeDialog, RecipeTypeDialogResult>);
  data: RecipeTypeDialogData = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    name: [this.data.recipeType?.name || '', Validators.required],
    sizes: this.fb.array(this.data.sizes.map(size => this.createSize(size)))
  });

  get sizes(): FormArray {
    return this.form.get('sizes') as FormArray;
  }

  private createSize(size?: Size) {
    return this.fb.group({
      id: [size?.id ?? null],
      name: [size?.name ?? '', [Validators.required, Validators.maxLength(30)]],
      // El factor dice cuánto lleva respecto del base, que es 1.
      factor: [size?.factor ?? 1, [Validators.required, Validators.min(0.01)]]
    });
  }

  addSize() {
    this.sizes.push(this.createSize());
  }

  removeSize(index: number) {
    this.sizes.removeAt(index);
  }

  onSave() {
    if (!this.form.valid) return;

    const { name, sizes } = this.form.getRawValue() as RecipeTypeDialogResult & {
      sizes: { id: string | null; name: string; factor: number }[];
    };

    this.dialogRef.close({
      name: name.trim(),
      sizes: sizes
        .filter(size => size.name.trim().length > 0)
        .map(size => ({
          ...(size.id ? { id: size.id } : {}),
          name: size.name.trim(),
          factor: Number(size.factor) || 1
        }))
    });
  }
}
