import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandMessagesComponent } from './brand-messages.component';

describe('BrandMessagesComponent', () => {
  let component: BrandMessagesComponent;
  let fixture: ComponentFixture<BrandMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandMessagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
