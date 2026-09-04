import { inject, Injectable } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

/**
 * Lo que devuelve un diálogo de edición cuando se pide borrar desde dentro.
 * El borrado vive en la propia edición y no en la lista: ahí ya está claro
 * sobre qué elemento se actúa, y la lista queda sin controles que apuntar.
 */
export const DELETE_REQUESTED = 'delete-requested' as const;

export type DeleteRequested = typeof DELETE_REQUESTED;

/**
 * Abre diálogos con presentación de móvil.
 *
 * El diálogo de Material, tal cual, ocupaba el 55% de un teléfono de 390×844:
 * una caja centrada con margen alrededor y los botones a 171px del borde
 * inferior, fuera del alcance cómodo del pulgar. Eso es una convención de
 * escritorio —una ventana sobre otra ventana—; en un móvil un formulario
 * ocupa la pantalla.
 *
 * Además engancha el gesto "atrás". Sin esto, con el formulario abierto,
 * atrás no cerraba nada: navegaba fuera de la app y se perdía lo escrito.
 * En Android ese gesto ES la forma de descartar, así que tiene que cerrar.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(MatDialog);

  /** Formularios: ocupan la pantalla entera. */
  openFullScreen<T, R = unknown, D = unknown>(
    component: ComponentType<T>, data?: D
  ): MatDialogRef<T, R> {
    const ref = this.dialog.open<T, D, R>(component, {
      data,
      panelClass: 'full-screen-dialog',
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      // Sin autofoco en el primer campo: en un móvil abriría el teclado de
      // golpe y taparía medio formulario antes de que se pueda leer.
      autoFocus: 'dialog',
    });

    this.closeOnBack(ref);
    return ref;
  }

  /**
   * Confirmaciones: compacto y centrado. Aquí la pantalla completa sobraría,
   * es una pregunta de una línea. Pero el gesto "atrás" tiene que cerrarla
   * igual, así que comparte esa parte.
   */
  openConfirm<T, R = unknown, D = unknown>(
    component: ComponentType<T>, data?: D
  ): MatDialogRef<T, R> {
    const ref = this.dialog.open<T, D, R>(component, {
      data,
      panelClass: 'compact-dialog',
      width: 'min(420px, calc(100vw - 32px))',
      autoFocus: 'dialog',
    });

    this.closeOnBack(ref);
    return ref;
  }

  /**
   * Añade una entrada al historial mientras el diálogo está abierto, para que
   * "atrás" lo cierre. Si se cierra por botón, esa entrada se consume para no
   * dejar un paso fantasma en el historial.
   */
  private closeOnBack(ref: MatDialogRef<unknown, unknown>): void {
    history.pushState({ appDialog: true }, '');

    const onBack = () => ref.close();
    window.addEventListener('popstate', onBack);

    ref.afterClosed().subscribe(() => {
      window.removeEventListener('popstate', onBack);
      if (history.state?.appDialog) history.back();
    });
  }
}
