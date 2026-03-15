import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorAiToolsComponent } from './creator-ai-tools.component';

describe('CreatorAiToolsComponent', () => {
  let component: CreatorAiToolsComponent;
  let fixture: ComponentFixture<CreatorAiToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorAiToolsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorAiToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
