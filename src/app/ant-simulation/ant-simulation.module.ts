import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AntSimulationComponent } from './components/ant-simulation/ant-simulation.component';

@NgModule({
  declarations: [
    AntSimulationComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    AntSimulationComponent,
  ],
})
export class AntSimulationModule { }
