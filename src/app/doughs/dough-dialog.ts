import { Component, inject, Inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Dough } from '../models/dough.model';
import { Cost } from '../models/cost.model';

interface DialogData {
  dough?: Dough;
  costs: Cost[];
}

@Component({
  selector: 'app-dough-dialog',
  standalone: true,
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
  template: `
    <h2 mat-dialog-title>{{ data.dough ? 'Editar' : 'Nueva' }} Masa</h2>
    <form [formGroup]="form" (ngSubmit)="onSave()">
      <mat-dialog-content class="dialog-content">
        
        <mat-form-field class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" placeholder="Ej: Masa napolitana">
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Peso por bollo (g)</mat-label>
          <input matInput type="number" formControlName="ballWeight" 
                 placeholder="Ej: 250">
          <mat-hint>Peso estándar para cada bollo de masa</mat-hint>
        </mat-form-field>

        <div class="ingredients-section">
          <div class="section-header">
            <h3>Ingredientes</h3>
            <button mat-mini-fab color="primary" type="button" 
                    (click)="addIngredient()">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div formArrayName="ingredients" class="ingredients-list">
            @for (ingredient of ingredients.controls; track $index) {
              <div [formGroupName]="$index" class="ingredient-row">
                <mat-form-field class="cost-field">
                  <mat-label>Insumo</mat-label>
                  <mat-select formControlName="costId">
                    @for (cost of data.costs; track cost.id) {
                      <mat-option [value]="cost.id">
                        {{ cost.product }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field class="quantity-field">
                  <mat-label>Cantidad (g)</mat-label>
                  <input matInput type="number" formControlName="quantity" 
                         placeholder="Ej: 100">
                </mat-form-field>

                <button mat-icon-button color="warn" type="button" 
                        (click)="removeIngredient($index)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>

      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancelar</button>
        <button mat-flat-button color="primary" type="submit" 
                [disabled]="!form.valid">
          Guardar
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      padding: 20px;
      min-width: 500px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .ingredients-section {
      margin-top: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0;
      color: #666;
      font-weight: 500;
    }

    .ingredients-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ingredient-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .cost-field {
      flex: 2;
    }

    .quantity-field {
      flex: 1;
    }

    mat-dialog-actions {
      padding: 16px 20px;
    }

    @media (max-width: 600px) {
      .dialog-content {
        min-width: 0;
        width: 100%;
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
export class DoughDialog implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<DoughDialog>);
  
  form!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.data.dough?.name || '', Validators.required],
      ballWeight: [this.data.dough?.ballWeight || 250, [Validators.required, Validators.min(1)]],
      ingredients: this.fb.array([])
    });

    if (this.data.dough?.ingredients) {
      this.data.dough.ingredients.forEach(ingredient => {
        this.ingredients.push(this.createIngredient(ingredient.costId, ingredient.quantity));
      });
    } else {
      this.addIngredient();
    }
  }

  get ingredients(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  createIngredient(costId: string = '', quantity: number = 0): FormGroup {
    return this.fb.group({
      costId: [costId, Validators.required],
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
