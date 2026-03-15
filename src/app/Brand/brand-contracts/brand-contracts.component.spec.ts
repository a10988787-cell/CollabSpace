import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandContractsComponent } from './brand-contracts.component';

describe('BrandContractsComponent', () => {
  let component: BrandContractsComponent;
  let fixture: ComponentFixture<BrandContractsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandContractsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandContractsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
