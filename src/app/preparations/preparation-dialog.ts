import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ingredientsTotal, Preparation } from '../models/preparation.model';
import { PricedItem } from '../models/priced-item.model';
import { Unit } from '../models/unit.model';

interface DialogData {
  preparation?: Preparation;
  costs: PricedItem[];
  units: Unit[];
}

@Component({
  selector: 'app-preparation-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './preparation-dialog.html',
  styleUrl: './preparation-dialog.css'
})
export class PreparationDialog implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<PreparationDialog>);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;

  ngOnInit() {
    const preparation = this.data.preparation;

    this.form = this.fb.group({
      name: [preparation?.name || '', Validators.required],
      // Sin rendimiento declarado, el lote rinde lo que suman sus ingredientes.
      yieldQuantity: [preparation?.yieldQuantity ?? null as number | null, [Validators.min(0)]],
      yieldUnitId: [preparation?.yieldUnitId ?? ''],
      defaultQuantity: [
        preparation?.defaultQuantity ?? preparation?.ballWeight ?? null as number | null,
        [Validators.min(0)]
      ],
      ingredients: this.fb.array([])
    });

    if (preparation?.ingredients?.length) {
      preparation.ingredients.forEach(ingredient => {
        this.ingredients.push(this.createIngredient(ingredient.supplyId, ingredient.quantity));
      });
    } else {
      this.addIngredient();
    }
  }

  /**
   * Lo que suman los ingredientes: es el rendimiento por defecto y sirve de
   * referencia al escribir el real —si cocinando gana o reduciendo pierde—.
   */
  get rawTotal(): number {
    return ingredientsTotal({
      name: '',
      ingredients: this.ingredients.value as { supplyId: string; quantity: number }[]
    });
  }

  get ingredients(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  createIngredient(supplyId = '', quantity = 0): FormGroup {
    return this.fb.group({
      supplyId: [supplyId, Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(0.01)]]
    });
  }

  addIngredient() {
    this.ingredients.push(this.createIngredient());
  }

  removeIngredient(index: number) {
    this.ingredients.removeAt(index);
  }

  onSave() {
    if (!this.form.valid) return;

    const { name, yieldQuantity, yieldUnitId, defaultQuantity, ingredients } = this.form.value;

    // Firestore no acepta undefined: los opcionales se omiten si no se llenaron.
    const preparation: Preparation = {
      name,
      ingredients,
      ...(yieldQuantity ? { yieldQuantity: Number(yieldQuantity) } : {}),
      ...(yieldUnitId ? { yieldUnitId } : {}),
      ...(defaultQuantity ? { defaultQuantity: Number(defaultQuantity) } : {})
    };

    this.dialogRef.close(preparation);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
