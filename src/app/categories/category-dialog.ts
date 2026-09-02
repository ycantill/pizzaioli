import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupplyCategory, SupplyCategoryKind } from '../models/supply-category.model';
import { inferCategoryKind } from '../services/catalog.service';

export interface CategoryDialogData {
  category?: SupplyCategory;
}

@Component({
  selector: 'app-category-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.css'
})
export class CategoryDialog {
  data: CategoryDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private dialogRef = inject(MatDialogRef<CategoryDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.category?.name || '', Validators.required],
    // Si el tipo viene sin clasificar, se propone lo que hoy se deduce del nombre.
    kind: [
      this.data.category?.kind ?? inferCategoryKind(this.data.category?.name ?? '') ?? 'ingrediente'
    ] as [SupplyCategoryKind]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const category: SupplyCategory = {
        ...this.data.category,
        ...this.form.getRawValue()
      };
      this.dialogRef.close(category);
    }
  }
}
