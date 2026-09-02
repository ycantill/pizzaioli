import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Dough } from '../models/dough.model';
import { PricedItem } from '../models/priced-item.model';

interface DialogData {
  dough?: Dough;
  costs: PricedItem[];
}

@Component({
  selector: 'app-dough-dialog',
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
  templateUrl: './dough-dialog.html',
  styleUrl: './dough-dialog.css'
})
export class DoughDialog implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<DoughDialog>);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.data.dough?.name || '', Validators.required],
      ballWeight: [this.data.dough?.ballWeight || 250, [Validators.required, Validators.min(1)]],
      ingredients: this.fb.array([])
    });

    if (this.data.dough?.ingredients) {
      this.data.dough.ingredients.forEach(ingredient => {
        this.ingredients.push(this.createIngredient(ingredient.supplyId, ingredient.quantity));
      });
    } else {
      this.addIngredient();
    }
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
    if (this.form.valid) {
      const dough: Dough = this.form.value;
      this.dialogRef.close(dough);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
