import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AntSimulationComponent } from './ant-simulation.component';

describe('AntSimulationComponent', () => {
  let component: AntSimulationComponent;
  let fixture: ComponentFixture<AntSimulationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AntSimulationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AntSimulationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
