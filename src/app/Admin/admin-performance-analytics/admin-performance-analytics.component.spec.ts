import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPerformanceAnalyticsComponent } from './admin-performance-analytics.component';

describe('AdminPerformanceAnalyticsComponent', () => {
  let component: AdminPerformanceAnalyticsComponent;
  let fixture: ComponentFixture<AdminPerformanceAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPerformanceAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPerformanceAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
