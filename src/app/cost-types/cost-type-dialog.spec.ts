import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CostTypeDialog } from './cost-type-dialog';
import { ReactiveFormsModule } from '@angular/forms';

describe('CostTypeDialog', () => {
  let component: CostTypeDialog;
  let fixture: any;
  let dialogRef: any;

  beforeEach(async () => {
    const dialogRefSpy = {
      close: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CostTypeDialog, ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CostTypeDialog);
    component = fixture.componentInstance;
    dialogRef = TestBed.inject(MatDialogRef);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values for new cost type', () => {
    expect(component.form.value).toEqual({ name: '' });
  });

  it('should initialize form with cost type data when editing', async () => {
    const existingCostType = { id: '1', name: 'Ingredientes' };
    
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CostTypeDialog, ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { costType: existingCostType } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } }
      ]
    }).compileComponents();

    const newFixture = TestBed.createComponent(CostTypeDialog);
    const newComponent = newFixture.componentInstance;
    
    expect(newComponent.form.value.name).toBe('Ingredientes');
  });

  it('should have invalid form when name is empty', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should have valid form when name is filled', () => {
    component.form.patchValue({ name: 'Embalaje' });
    expect(component.form.valid).toBe(true);
  });

  it('should close dialog without data when onCancel is called', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with cost type data when onSave is called with valid form', () => {
    component.form.patchValue({ name: 'Transporte' });

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith({
      name: 'Transporte'
    });
  });

  it('should not close dialog when onSave is called with invalid form', () => {
    component.form.patchValue({ name: '' });

    component.onSave();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should show required error for name field', () => {
    const nameControl = component.form.get('name');
    nameControl?.markAsTouched();
    
    expect(nameControl?.hasError('required')).toBe(true);
  });

  it('should preserve existing id when editing', async () => {
    const existingCostType = { id: '123', name: 'Old Name' };
    
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CostTypeDialog, ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { costType: existingCostType } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } }
      ]
    }).compileComponents();

    const newFixture = TestBed.createComponent(CostTypeDialog);
    const newComponent = newFixture.componentInstance;
    const newDialogRef = TestBed.inject(MatDialogRef);
    
    newComponent.form.patchValue({ name: 'New Name' });
    newComponent.onSave();

    expect(newDialogRef.close).toHaveBeenCalledWith({
      id: '123',
      name: 'New Name'
    });
  });
});
