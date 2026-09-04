import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Packaging, PackagingItem } from '../models/packaging.model';
import { RecipeType } from '../models/recipe-type.model';
import { Size } from '../models/size.model';
import { PricedItem } from '../models/priced-item.model';
import { Unit } from '../models/unit.model';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';

export interface PackagingDialogData {
  packaging?: Packaging;
  recipeType: RecipeType;
  /** El tamaño al que aplica, o null si vale para todos. */
  size: Size | null;
  costs: PricedItem[];
  units: Unit[];
}

@Component({
  selector: 'app-packaging-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './packaging-dialog.html',
  styleUrl: './packaging-dialog.css'
})
export class PackagingDialog {
  data: PackagingDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PackagingDialog, Packaging | DeleteRequested>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    items: this.fb.array(
      this.data.packaging?.items?.length 
        ? this.data.packaging.items.map(item => this.createItemGroup(item))
        : [this.createItemGroup()]
    )
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  createItemGroup(item?: PackagingItem) {
    return this.fb.group({
      supplyId: [item?.supplyId || this.data.costs[0]?.id || '', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]]
    });
  }

  availableCosts(currentIndex: number): PricedItem[] {
    const currentSupplyId = this.itemsArray.at(currentIndex).get('supplyId')?.value;
    const usedSupplyIds = this.itemsArray.controls
      .map((ctrl, idx) => idx !== currentIndex ? ctrl.get('supplyId')?.value : null)
      .filter(id => id !== null);
    
    return this.data.costs.filter(c => 
      c.id === currentSupplyId || !usedSupplyIds.includes(c.id)
    );
  }

  addItem() {
    const usedSupplyIds = this.itemsArray.controls.map(ctrl => ctrl.get('supplyId')?.value);
    const availableCost = this.data.costs.find(c => !usedSupplyIds.includes(c.id));
    
    if (availableCost) {
      this.itemsArray.push(this.createItemGroup({
        supplyId: availableCost.id!,
        quantity: 1
      }));
    }
  }

  removeItem(index: number) {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onDelete(): void {
    this.dialogRef.close(DELETE_REQUESTED);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const packaging: Packaging = {
        recipeTypeId: this.data.recipeType.id!,
        // Firestore no acepta undefined: sin tamaño, el campo no va.
        ...(this.data.size?.id ? { sizeId: this.data.size.id } : {}),
        items: formValue.items as PackagingItem[]
      };
      this.dialogRef.close(packaging);
    }
  }
}
