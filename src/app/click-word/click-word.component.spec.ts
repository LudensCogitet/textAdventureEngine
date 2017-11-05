import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClickWordComponent } from './click-word.component';

describe('ClickWordComponent', () => {
  let component: ClickWordComponent;
  let fixture: ComponentFixture<ClickWordComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClickWordComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClickWordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
