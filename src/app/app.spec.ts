import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should toggle menu', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    expect(app.menuOpen()).toBe(false);
    app.toggleMenu();
    expect(app.menuOpen()).toBe(true);
    app.toggleMenu();
    expect(app.menuOpen()).toBe(false);
  });
});
