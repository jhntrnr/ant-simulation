import { Injectable } from '@angular/core';
import { Vector2 } from 'three';
import { Ant, AntState } from '../models/ant.model';
import { FoodService } from './food.service';
import { GridService } from './grid.service';
import { CellType } from '../models/cell.model';

@Injectable({
    providedIn: 'root',
})

export class AntService {
    ants: Ant[] = [];
    maxAnts: number = 400;
    constructor(private gridService: GridService) {}

    public createAnt(x: number, y: number): void {
        if(this.ants.length > this.maxAnts){
            return;
        }
        const ant = new Ant((x + (0.5)) + Math.random() - 0.5, (y + (0.5)) + Math.random() - 0.5);
        this.ants.push(ant);
    }

    public updateAnts(): void {
        this.moveAnts(this.gridService);
    }

    public getAnts(): Ant[] {
        return this.ants;
    }

    public killAllAnts(): void {
        this.ants = [];
    }

    public moveAnts(gridService: GridService): void {
        const visionRange = 3;
        const grabRange = 0.6;
        const cellSize = gridService.grid.cellSize;
        let antsDying: Ant[] = [];
        for (const ant of this.ants) {
            if(Math.random() < ant.chanceToDie){
                antsDying.push(ant);
                continue;
            }
            let desiredVelocity = new Vector2(0, 0);
            const nearbyCellsLineOfSight = gridService.getCellsInRangeLineOfSight(ant.position, visionRange);
            const nearbyCellsAll = gridService.getCellsInRange(ant.position, visionRange);
            if (ant.state === AntState.FoodSearch && nearbyCellsLineOfSight.length > 0) {
                const foodCell = nearbyCellsLineOfSight.find(cell => cell.type === CellType.FoodSpawn);
                if(foodCell !== undefined && ant.position.distanceTo(foodCell.position) <= visionRange * cellSize) {
                    if(ant.position.distanceTo(foodCell.position) < grabRange){
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
                    if(ant.position.distanceTo(antSpawnCell.position) < grabRange){
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
            ant.stayInBounds(gridService.width, gridService.height);
            ant.applyRandomSteering();
            ant.layPheromones(gridService);
        }

        antsDying.forEach((deadAnt) => {
            const index = this.ants.indexOf(deadAnt, 0);
            if (index > -1) {
                this.ants.splice(index, 1);
            }
        });
    }
}