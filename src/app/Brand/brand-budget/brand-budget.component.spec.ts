import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandBudgetComponent } from './brand-budget.component';

describe('BrandBudgetComponent', () => {
  let component: BrandBudgetComponent;
  let fixture: ComponentFixture<BrandBudgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandBudgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
