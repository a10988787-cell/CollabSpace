import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandPaymentsComponent } from './brand-payments.component';

describe('BrandPaymentsComponent', () => {
  let component: BrandPaymentsComponent;
  let fixture: ComponentFixture<BrandPaymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandPaymentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
