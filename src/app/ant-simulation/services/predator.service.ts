import { Injectable } from '@angular/core';
import { Vector2 } from 'three';
import { Predator, PredatorState } from '../models/predator.model';
import { GridService } from './grid.service';
import { CellType, PheromoneType } from '../models/cell.model';
import { AntService } from './ant.service';

@Injectable({
    providedIn: 'root',
})

export class PredatorService {
    predators: Predator[] = [];
    maxPredators: number = 6;
    predatorLifespan: number = 0.005;
    constructor(private gridService: GridService, private antService: AntService) {}

    public createPredator(x: number, y: number): void {
        if(this.predators.length > this.maxPredators){
            return;
        }
        const predator = new Predator((x + (0.5)) + Math.random() - 0.5, (y + (0.5)) + Math.random() - 0.5);
        this.predators.push(predator);
    }

    public updatePredators(): void {
        this.movePredators(this.antService, this.gridService);
    }

    public getPredators(): Predator[] {
        return this.predators;
    }

    public killAllPredators(): void {
        this.predators = [];
    }

    public movePredators(antService: AntService, gridService: GridService): void {
        const visionRange = 3;
        const grabRange = 1;
        const cellSize = gridService.grid.cellSize;
        let predatorsDying: Predator[] = [];
        for (const predator of this.predators) {
            if(Math.random() < this.predatorLifespan){
                predatorsDying.push(predator);
                continue;
            }
            let desiredVelocity = new Vector2(0, 0);
            const nearbyCellsLineOfSight = gridService.getCellsInRangeLineOfSight(predator.position, visionRange)
                .sort((a, b) => predator.position.distanceTo(a.position) - predator.position.distanceTo(b.position));
            const nearbyCellsAll = gridService.getCellsInRange(predator.position, visionRange)
                .sort((a, b) => predator.position.distanceTo(a.position) - predator.position.distanceTo(b.position));
            const nearbyAntsAll = antService.getAntsInRange(predator.position, visionRange)
                .sort((a, b) => predator.position.distanceTo(a.position) - predator.position.distanceTo(b.position));
            if (predator.state === PredatorState.PreySearch && nearbyCellsLineOfSight.length > 0) {
                const antTarget = nearbyAntsAll[0];
                if(antTarget !== undefined) {
                    if(predator.position.distanceTo(antTarget.position.clone().add(new Vector2(0.5,0.5))) < grabRange){
                        predator.setFoodCarrying(true);
                        for(const ant of nearbyAntsAll){
                            ant.layScalarPheromonesByType(gridService, PheromoneType.DistressPheromone, 0.75);
                        }
                        antService.killSpecificAnt(antTarget, gridService);
                    }
                    else{
                        desiredVelocity = predator.moveToward(antTarget.position);
                    }
                }
            } else if (predator.state === PredatorState.Feeding) {
                predator.feedingTime += 1;
                if(predator.feedingTime >= predator.digestionTime){
                    predator.feedingTime = 0;
                    predator.setFoodCarrying(false);
                }
            }
            predator.avoidObstacles(nearbyCellsAll,gridService, desiredVelocity);
            predator.stayInBounds(gridService.width, gridService.height);
            predator.applyRandomSteering();
        }

        predatorsDying.forEach((deadPredator) => {
            const index = this.predators.indexOf(deadPredator, 0);
            if (index > -1) {
                this.predators.splice(index, 1);
            }
        });
    }
}