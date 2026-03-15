import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorRevenueComponent } from './creator-revenue.component';

describe('CreatorRevenueComponent', () => {
  let component: CreatorRevenueComponent;
  let fixture: ComponentFixture<CreatorRevenueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorRevenueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorRevenueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
