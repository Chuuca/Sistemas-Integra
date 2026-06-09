import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationDashboard } from './operation-dashboard';

describe('OperationDashboard', () => {
  let component: OperationDashboard;
  let fixture: ComponentFixture<OperationDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
