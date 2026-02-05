import { TestBed } from '@angular/core/testing';
import { Units } from './units';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Mock } from 'vitest';

describe('Units', () => {
  let component: Units;
  let firestoreService: any;
  let dialog: any;

  beforeEach(async () => {
    const firestoreSpy = {
      getDocuments: vi.fn(),
      addDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn()
    };
    const dialogSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Units],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    firestoreService = TestBed.inject(FirestoreService);
    dialog = TestBed.inject(MatDialog);

    const fixture = TestBed.createComponent(Units);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayedColumns', () => {
    expect(component.displayedColumns).toEqual(['name', 'abbreviation', 'actions']);
  });

  it('should load units on init', async () => {
    const mockUnits = [
      { id: '1', name: 'Kilogramo', abbreviation: 'kg' },
      { id: '2', name: 'Litro', abbreviation: 'L' }
    ];

    firestoreService.getDocuments.mockResolvedValue(mockUnits);

    await component.ngOnInit();

    expect(firestoreService.getDocuments).toHaveBeenCalledWith('units');
    expect(component.units()).toEqual(mockUnits);
    expect(component.loading()).toBe(false);
  });

  it('should handle errors when loading units', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    firestoreService.getDocuments.mockRejectedValue(new Error('Load error'));

    await component.loadUnits();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading units:', expect.any(Error));
    expect(component.loading()).toBe(false);
  });

  it('should add a new unit', async () => {
    const newUnit = { name: 'Gramo', abbreviation: 'g' };
    const dialogRef = {
      afterClosed: () => of(newUnit)
    };

    dialog.open.mockReturnValue(dialogRef as any);
    firestoreService.addDocument.mockResolvedValue({ id: '3' } as any);

    component.addUnit();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(dialog.open).toHaveBeenCalled();
    expect(firestoreService.addDocument).toHaveBeenCalledWith('units', newUnit);
  });

  it('should edit a unit', async () => {
    const existingUnit = { id: '1', name: 'Kilogramo', abbreviation: 'kg' };
    const updatedUnit = { name: 'Kilogramo', abbreviation: 'Kg' };
    const dialogRef = {
      afterClosed: () => of(updatedUnit)
    };

    component.units.set([existingUnit]);
    dialog.open.mockReturnValue(dialogRef as any);
    firestoreService.updateDocument.mockResolvedValue(undefined);

    component.editUnit(existingUnit);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(firestoreService.updateDocument).toHaveBeenCalledWith('units', '1', updatedUnit);
  });

  it('should delete a unit when confirmed', async () => {
    const unitToDelete = { id: '1', name: 'Kilogramo', abbreviation: 'kg' };
    const unitToKeep = { id: '2', name: 'Litro', abbreviation: 'L' };
    
    component.units.set([unitToDelete, unitToKeep]);
    expect(component.units().length).toBe(2);
    
    let resolveDialog: any;
    const dialogPromise = new Promise(resolve => { resolveDialog = resolve; });
    
    const dialogRef = {
      afterClosed: () => {
        setTimeout(() => resolveDialog(true), 0);
        return of(true);
      }
    };

    dialog.open.mockReturnValue(dialogRef as any);
    firestoreService.deleteDocument.mockResolvedValue(undefined);

    component.deleteUnit(unitToDelete);
    await dialogPromise;
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(dialog.open).toHaveBeenCalled();
  });
});
