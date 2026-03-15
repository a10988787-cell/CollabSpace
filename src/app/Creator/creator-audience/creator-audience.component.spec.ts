import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorAudienceComponent } from './creator-audience.component';

describe('CreatorAudienceComponent', () => {
  let component: CreatorAudienceComponent;
  let fixture: ComponentFixture<CreatorAudienceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorAudienceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorAudienceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
