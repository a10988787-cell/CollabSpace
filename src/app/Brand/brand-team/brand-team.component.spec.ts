import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandTeamComponent } from './brand-team.component';

describe('BrandTeamComponent', () => {
  let component: BrandTeamComponent;
  let fixture: ComponentFixture<BrandTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandTeamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
