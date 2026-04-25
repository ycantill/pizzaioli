import { TestBed } from '@angular/core/testing';
import { CostTypes } from './cost-types';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('CostTypes', () => {
  let component: CostTypes;
  let fixture: any;
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
      imports: [CostTypes],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    firestoreService = TestBed.inject(FirestoreService);
    dialog = TestBed.inject(MatDialog);

    fixture = TestBed.createComponent(CostTypes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayedColumns', () => {
    expect(component.displayedColumns).toEqual(['name', 'actions']);
  });

  it('should load cost types on init', async () => {
    const mockCostTypes = [
      { id: '1', name: 'Ingredientes' },
      { id: '2', name: 'Embalaje' }
    ];

    firestoreService.getDocuments.mockResolvedValue(mockCostTypes);

    await component.ngOnInit();

    expect(firestoreService.getDocuments).toHaveBeenCalledWith('cost-types');
    expect(component.costTypes()).toEqual(mockCostTypes);
    expect(component.loading()).toBe(false);
  });

  it('should handle errors when loading cost types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    firestoreService.getDocuments.mockRejectedValue(new Error('Load error'));

    await component.loadCostTypes();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading cost types:', expect.any(Error));
    expect(component.loading()).toBe(false);
  });

  it('should add a new cost type', async () => {
    const newCostType = { name: 'Transporte' };
    const dialogRef = {
      afterClosed: () => of(newCostType)
    };

    dialog.open.mockReturnValue(dialogRef as any);
    firestoreService.addDocument.mockResolvedValue({ id: '3' } as any);

    component.addCostType();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(dialog.open).toHaveBeenCalled();
    expect(firestoreService.addDocument).toHaveBeenCalledWith('cost-types', newCostType);
  });

  it('should edit a cost type', async () => {
    const existingCostType = { id: '1', name: 'Ingredientes' };
    const updatedCostType = { name: 'Ingredientes Premium' };
    const dialogRef = {
      afterClosed: () => of(updatedCostType)
    };

    component.costTypes.set([existingCostType]);
    dialog.open.mockReturnValue(dialogRef as any);
    firestoreService.updateDocument.mockResolvedValue(undefined);

    component.editCostType(existingCostType);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(firestoreService.updateDocument).toHaveBeenCalledWith('cost-types', '1', updatedCostType);
  });

  it('should delete a cost type when confirmed', async () => {
    const costTypeToDelete = { id: '1', name: 'Ingredientes' };
    const costTypeToKeep = { id: '2', name: 'Embalaje' };
    
    component.costTypes.set([costTypeToDelete, costTypeToKeep]);
    expect(component.costTypes().length).toBe(2);
    
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

    component.deleteCostType(costTypeToDelete);
    await dialogPromise;
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(dialog.open).toHaveBeenCalled();
  });

  it('should not delete when user cancels', async () => {
    const costType = { id: '1', name: 'Ingredientes' };
    
    // Initialize the signal with data
    component.costTypes.set([costType]);
    fixture.detectChanges();
    
    // Verify initial state
    const initialTypes = component.costTypes();
    expect(initialTypes).toBeDefined();
    expect(initialTypes.length).toBe(1);
    
    const dialogRef = {
      afterClosed: () => of(false)
    };

    dialog.open.mockReturnValue(dialogRef as any);

    component.deleteCostType(costType);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(firestoreService.deleteDocument).not.toHaveBeenCalled();
    expect(component.costTypes().length).toBe(1);
  });
});
