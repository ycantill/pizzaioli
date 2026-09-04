import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupplyCategory, SupplyCategoryKind } from '../models/supply-category.model';
import { inferCategoryKind } from '../services/catalog.service';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';

export interface CategoryDialogData {
  category?: SupplyCategory;
}

@Component({
  selector: 'app-category-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.css'
})
export class CategoryDialog {
  data: CategoryDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private dialogRef = inject(MatDialogRef<CategoryDialog, SupplyCategory | DeleteRequested>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.category?.name || '', Validators.required],
    // Si el tipo viene sin clasificar, se propone lo que hoy se deduce del nombre.
    kind: [
      this.data.category?.kind ?? inferCategoryKind(this.data.category?.name ?? '') ?? 'ingrediente'
    ] as [SupplyCategoryKind]
  });

  /**
   * Un error solo se muestra si el usuario ya pasó por el campo: con controles
   * nativos hay que reponer lo que hacía mat-form-field, o el formulario
   * aparece en rojo antes de que nadie haya escrito nada.
   */
  showError(field: string, error: string): boolean {
    const control = this.form.get(field);
    return !!control && control.touched && control.hasError(error);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    this.dialogRef.close(DELETE_REQUESTED);
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
