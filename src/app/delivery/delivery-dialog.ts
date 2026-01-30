import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Delivery, DeliveryItem } from '../models/delivery.model';
import { RecipeType } from '../models/recipe-type.model';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';

export interface DeliveryDialogData {
  delivery?: Delivery;
  recipeType: RecipeType;
  costs: Cost[];
  units: Unit[];
}

@Component({
  selector: 'app-delivery-dialog',
  standalone: true,
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
    <h2 mat-dialog-title>Configurar Delivery - {{ data.recipeType.name }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="items-section">
          <div class="section-header">
            <h3>Costos de Delivery</h3>
            <button mat-icon-button type="button" (click)="addItem()" color="primary">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>

          <div formArrayName="items" class="items-list">
            @for (item of itemsArray.controls; track $index) {
              <div [formGroupName]="$index" class="item-row">
                <mat-form-field appearance="outline" class="cost-field">
                  <mat-label>Costo</mat-label>
                  <mat-select formControlName="costId">
                    @for (cost of availableCosts($index); track cost.id) {
                      <mat-option [value]="cost.id">{{ cost.product }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="quantity-field">
                  <mat-label>Cantidad</mat-label>
                  <input matInput type="number" formControlName="quantity" min="1">
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

      .item-row {
        flex-wrap: wrap;
      }

      .cost-field,
      .quantity-field {
        flex: 1 1 100%;
      }
    }
  `]
})
export class DeliveryDialog {
  data: DeliveryDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<DeliveryDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    items: this.fb.array(
      this.data.delivery?.items?.length 
        ? this.data.delivery.items.map(item => this.createItemGroup(item))
        : [this.createItemGroup()]
    )
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  createItemGroup(item?: DeliveryItem) {
    return this.fb.group({
      costId: [item?.costId || this.data.costs[0]?.id || '', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]]
    });
  }

  availableCosts(currentIndex: number): Cost[] {
    const currentCostId = this.itemsArray.at(currentIndex).get('costId')?.value;
    const usedCostIds = this.itemsArray.controls
      .map((ctrl, idx) => idx !== currentIndex ? ctrl.get('costId')?.value : null)
      .filter(id => id !== null);
    
    return this.data.costs.filter(c => 
      c.id === currentCostId || !usedCostIds.includes(c.id)
    );
  }

  addItem() {
    const usedCostIds = this.itemsArray.controls.map(ctrl => ctrl.get('costId')?.value);
    const availableCost = this.data.costs.find(c => !usedCostIds.includes(c.id));
    
    if (availableCost) {
      this.itemsArray.push(this.createItemGroup({
        costId: availableCost.id!,
        quantity: 1
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
      const delivery: Delivery = {
        recipeTypeId: this.data.recipeType.id!,
        items: formValue.items as DeliveryItem[]
      };
      this.dialogRef.close(delivery);
    }
  }
}
