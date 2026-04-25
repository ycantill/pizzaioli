import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UnitDialog } from './unit-dialog';
import { ReactiveFormsModule } from '@angular/forms';

describe('UnitDialog', () => {
  let component: UnitDialog;
  let fixture: any;
  let dialogRef: any;

  beforeEach(async () => {
    const dialogRefSpy = {
      close: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UnitDialog, ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnitDialog);
    component = fixture.componentInstance;
    dialogRef = TestBed.inject(MatDialogRef);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values for new unit', () => {
    expect(component.form.value).toEqual({ name: '', abbreviation: '' });
  });

  it('should initialize form with unit data when editing', async () => {
    const existingUnit = { id: '1', name: 'Kilogramo', abbreviation: 'kg' };
    
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UnitDialog, ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { unit: existingUnit } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } }
      ]
    }).compileComponents();

    const newFixture = TestBed.createComponent(UnitDialog);
    const newComponent = newFixture.componentInstance;
    
    expect(newComponent.form.value.name).toBe('Kilogramo');
    expect(newComponent.form.value.abbreviation).toBe('kg');
  });

  it('should have invalid form when fields are empty', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should have valid form when all required fields are filled', () => {
    component.form.patchValue({
      name: 'Litro',
      abbreviation: 'L'
    });
    expect(component.form.valid).toBe(true);
  });

  it('should close dialog without data when onCancel is called', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with unit data when onSave is called with valid form', () => {
    component.form.patchValue({
      name: 'Litro',
      abbreviation: 'L'
    });

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith({
      name: 'Litro',
      abbreviation: 'L'
    });
  });

  it('should not close dialog when onSave is called with invalid form', () => {
    component.form.patchValue({
      name: '',
      abbreviation: ''
    });

    component.onSave();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should show required error for name field', () => {
    const nameControl = component.form.get('name');
    nameControl?.markAsTouched();
    
    expect(nameControl?.hasError('required')).toBe(true);
  });

  it('should show required error for abbreviation field', () => {
    const abbreviationControl = component.form.get('abbreviation');
    abbreviationControl?.markAsTouched();
    
    expect(abbreviationControl?.hasError('required')).toBe(true);
  });
});
