import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGrowthMetricsComponent } from './admin-growth-metrics.component';

describe('AdminGrowthMetricsComponent', () => {
  let component: AdminGrowthMetricsComponent;
  let fixture: ComponentFixture<AdminGrowthMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGrowthMetricsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminGrowthMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
