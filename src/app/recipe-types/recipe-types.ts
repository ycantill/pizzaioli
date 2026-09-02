import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RecipeType } from '../models/recipe-type.model';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { RecipeTypeDialog } from './recipe-type-dialog';

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

  recipeTypes = this.recipeTypesService.recipeTypes;
  displayedColumns: string[] = ['name', 'actions'];

  openDialog(recipeType?: RecipeType) {
    const dialogRef = this.dialog.open(RecipeTypeDialog, {
      width: '400px',
      data: recipeType || null
    });

    dialogRef.afterClosed().subscribe(async (result: RecipeType | undefined) => {
      if (result) {
        try {
          if (recipeType?.id) {
            await this.recipeTypesService.update(recipeType.id, result);
          } else {
            await this.recipeTypesService.add(result);
          }
        } catch (error) {
          console.error('Error saving recipe type:', error);
        }
      }
    });
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
