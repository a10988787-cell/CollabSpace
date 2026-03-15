import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandCollaborationsComponent } from './brand-collaborations.component';

describe('BrandCollaborationsComponent', () => {
  let component: BrandCollaborationsComponent;
  let fixture: ComponentFixture<BrandCollaborationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandCollaborationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandCollaborationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
