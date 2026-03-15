import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandCampaignsComponent } from './brand-campaigns.component';

describe('BrandCampaignsComponent', () => {
  let component: BrandCampaignsComponent;
  let fixture: ComponentFixture<BrandCampaignsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandCampaignsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandCampaignsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
