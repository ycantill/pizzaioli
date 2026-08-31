import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BatchOperation, FirestoreService } from '../firestore.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { buildRenamePlan, RawDocument, RENAME_SPECS, RenamePlan } from './rename-plan';

@Component({
  selector: 'app-maintenance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css'
})
export class Maintenance {
  private dialog = inject(MatDialog);
  private firestoreService = inject(FirestoreService);

  readonly scanning = signal(false);
  readonly applying = signal(false);
  readonly plans = signal<RenamePlan[] | null>(null);
  readonly result = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly totalPending = computed(() =>
    (this.plans() ?? []).reduce((sum, plan) => sum + plan.pending, 0)
  );

  readonly canApply = computed(() =>
    !this.applying() && !this.scanning() && this.totalPending() > 0
  );

  /** Lee los documentos en crudo: los servicios normalizan y esconderían el campo viejo. */
  async scan() {
    this.scanning.set(true);
    this.result.set(null);
    this.error.set(null);

    try {
      const plans = await Promise.all(
        RENAME_SPECS.map(async spec => {
          const documents = await this.firestoreService.getDocuments(spec.collection);
          return buildRenamePlan(spec, documents as RawDocument[]);
        })
      );
      this.plans.set(plans);
    } catch (error) {
      console.error('Error scanning collections:', error);
      this.error.set('No se pudieron leer las colecciones.');
    } finally {
      this.scanning.set(false);
    }
  }

  applyRename() {
    const plans = this.plans() ?? [];
    const operations = plans.flatMap(plan => plan.operations);

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '460px',
      data: {
        title: 'Renombrar el campo',
        message:
          `Se actualizarán ${operations.length} documentos para reemplazar costId por ` +
          `supplyId o rateId. La app ya entiende los dos nombres, así que nada deja de ` +
          `funcionar durante el cambio. ¿Continuar?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;

      this.applying.set(true);
      this.result.set(null);
      this.error.set(null);

      try {
        await this.commit(operations);
        await this.scan();
        this.result.set(`Listo: ${operations.length} documentos actualizados.`);
      } catch (error) {
        console.error('Error renaming field:', error);
        this.error.set('El renombrado falló. Es idempotente: podés volver a ejecutarlo.');
      } finally {
        this.applying.set(false);
      }
    });
  }

  private async commit(operations: BatchOperation[]): Promise<void> {
    await this.firestoreService.commitBatch(operations);
  }
}
