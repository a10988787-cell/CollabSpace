import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBudgetsComponent } from './admin-budgets.component';

describe('AdminBudgetsComponent', () => {
  let component: AdminBudgetsComponent;
  let fixture: ComponentFixture<AdminBudgetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBudgetsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBudgetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
