import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RecipeType } from '../models/recipe-type.model';
import { Size, sizesOf } from '../models/size.model';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { SizesDataService } from '../services/sizes-data.service';
import { RecipeTypeDialog, RecipeTypeDialogResult } from './recipe-type-dialog';

@Component({
  selector: 'app-recipe-types',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './recipe-types.html',
  styleUrl: './recipe-types.css'
})
export class RecipeTypes {
  private dialog = inject(MatDialog);
  private recipeTypesService = inject(RecipeTypesDataService);
  private sizesService = inject(SizesDataService);

  recipeTypes = this.recipeTypesService.recipeTypes;
  displayedColumns: string[] = ['name', 'sizes', 'actions'];

  /** Los tamaños de esa familia, del más chico al más grande. */
  sizesOfType(recipeTypeId: string | undefined): Size[] {
    return sizesOf(this.sizesService.sizes(), recipeTypeId);
  }

  sizesLabel(recipeTypeId: string | undefined): string {
    const sizes = this.sizesOfType(recipeTypeId);
    if (sizes.length === 0) return 'Tamaño único';
    return sizes.map(size => `${size.name} ×${size.factor}`).join(' · ');
  }

  openDialog(recipeType?: RecipeType) {
    const dialogRef = this.dialog.open(RecipeTypeDialog, {
      width: '520px',
      maxHeight: '90vh',
      data: { recipeType, sizes: this.sizesOfType(recipeType?.id) }
    });

    dialogRef.afterClosed().subscribe(async (result: RecipeTypeDialogResult | undefined) => {
      if (!result) return;

      try {
        let id = recipeType?.id;
        if (id) {
          await this.recipeTypesService.update(id, { name: result.name });
        } else {
          id = await this.recipeTypesService.add({ name: result.name });
        }

        await this.syncSizes(id, result.sizes);
      } catch (error) {
        console.error('Error saving recipe type:', error);
      }
    });
  }

  /**
   * Deja los tamaños de la familia como quedaron en el diálogo: los que traen
   * id se actualizan, los nuevos nacen y los que ya no están se borran.
   */
  private async syncSizes(
    recipeTypeId: string,
    sizes: { id?: string; name: string; factor: number }[]
  ): Promise<void> {
    const previous = this.sizesOfType(recipeTypeId);
    const kept = new Set(sizes.map(size => size.id).filter(Boolean));

    for (const size of previous) {
      if (size.id && !kept.has(size.id)) await this.sizesService.remove(size.id);
    }

    for (const size of sizes) {
      const data: Size = { recipeTypeId, name: size.name, factor: size.factor };
      if (size.id) {
        await this.sizesService.update(size.id, data);
      } else {
        await this.sizesService.add(data);
      }
    }
  }

  async deleteRecipeType(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este tipo de receta?')) {
      try {
        await this.recipeTypesService.remove(id);
      } catch (error) {
        console.error('Error deleting recipe type:', error);
      }
    }
  }
}
