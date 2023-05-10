import { Injectable } from '@angular/core';
import { Vector2 } from 'three';
import { Ant, AntState } from '../models/ant.model';
import { PredatorService } from './predator.service';
import { GridService } from './grid.service';
import { CellType } from '../models/cell.model';

@Injectable({
    providedIn: 'root',
})

export class AntService {
    ants: Ant[] = [];
    maxAnts: number = 1;
    antVisionRange: number = 3;
    antLifespan: number = 0.0005;
    constructor(private gridService: GridService) {}

    public createAnt(x: number, y: number): void {
        if(this.ants.length > this.maxAnts){
            return;
        }
        const ant = new Ant((x + (0.5)) + Math.random() - 0.5, (y + (0.5)) + Math.random() - 0.5);
        this.ants.push(ant);
    }

    public updateAnts(predatorService: PredatorService): void {
        this.moveAnts(predatorService,this.gridService);
    }

    public getAnts(): Ant[] {
        return this.ants;
    }

    public killAllAnts(): void {
        this.ants = [];
    }

    public killSpecificAnt(deadAnt: Ant, gridService: GridService, layDistressPheromones: boolean = false): void {
        const index = this.ants.indexOf(deadAnt, 0);
        if (index > -1) {
            this.ants.splice(index, 1);
        }
    }

    public getAntsInRange(predatorPosition: Vector2, visionRange: number) : Ant[] {
        let antsInRange: Ant[] = [];
        for (const ant of this.ants) {
            if(ant.position.distanceTo(predatorPosition) < visionRange){
                antsInRange.push(ant);
            }
        }
        return antsInRange;
    }

    public moveAnts(predatorService: PredatorService, gridService: GridService): void {
        this.antVisionRange = 3;
        const grabRange = 1;
        const cellSize = gridService.grid.cellSize;
        let antsDying: Ant[] = [];
        for (const ant of this.ants) {
            if(Math.random() < this.antLifespan || ant.isSuffocating(gridService)){
                antsDying.push(ant);
                continue;
            }
            let desiredVelocity = new Vector2(0, 0);
            const nearbyCellsLineOfSight = gridService.getCellsInRangeLineOfSight(ant.position, this.antVisionRange, true)
                .sort((a, b) => ant.position.distanceTo(a.position) - ant.position.distanceTo(b.position));
            const nearbyCellsAll = gridService.getCellsInRange(ant.position, this.antVisionRange)
                .sort((a, b) => ant.position.distanceTo(a.position) - ant.position.distanceTo(b.position));
            if (ant.state === AntState.FoodSearch && nearbyCellsLineOfSight.length > 0) {
                const foodCell = nearbyCellsLineOfSight.find(cell => cell.type === CellType.FoodSpawn);
                if(foodCell !== undefined && ant.position.distanceTo(foodCell.position) <= this.antVisionRange * cellSize) {
                    if(ant.position.distanceTo(foodCell.position.clone().add(new Vector2(0.5,0.5))) < grabRange){
                        ant.setFoodCarrying(true);
                    }
                    else{
                        desiredVelocity = ant.moveToward(foodCell.position);
                    }
                } else {
                    desiredVelocity = ant.followPheromones(nearbyCellsLineOfSight);
                }
            } else if (ant.state === AntState.HomeSearch && nearbyCellsLineOfSight.some(cell => cell.type === CellType.AntSpawn)) {
                const antSpawnCell = nearbyCellsLineOfSight.find(cell => cell.type === CellType.AntSpawn);
                if(antSpawnCell !== undefined){
                    if(ant.position.distanceTo(antSpawnCell.position.clone().add(new Vector2(0.5,0.5))) < grabRange){
                        ant.setFoodCarrying(false);
                    }
                    else{
                        desiredVelocity = ant.moveToward(antSpawnCell.position);
                    }
                }
            } else {
                desiredVelocity = ant.followPheromones(nearbyCellsLineOfSight);
            }
            ant.avoidObstacles(nearbyCellsAll,gridService, desiredVelocity);
            ant.avoidPredators(predatorService,gridService,desiredVelocity);
            ant.stayInBounds(gridService.width, gridService.height);
            ant.applyRandomSteering();
            ant.layVectorPheromones(gridService);
        }

        antsDying.forEach((deadAnt) => {
            this.killSpecificAnt(deadAnt, gridService);
        });
    }
}