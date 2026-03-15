import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorMessagesComponent } from './creator-messages.component';

describe('CreatorMessagesComponent', () => {
  let component: CreatorMessagesComponent;
  let fixture: ComponentFixture<CreatorMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorMessagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
