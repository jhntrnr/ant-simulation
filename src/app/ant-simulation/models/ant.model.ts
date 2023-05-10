import { Vector2 } from 'three';

import { Cell, CellType, PheromoneType } from './cell.model';
import { Predator } from './predator.model';
import { PredatorService } from '../services/predator.service';
import { GridService } from '../services/grid.service';
import { limitVector, rotateVector } from '../utils/vector-utils';
import { Grid } from './grid.model';


export enum AntState {
    FoodSearch,
    HomeSearch,
}

export class Ant {
    public x: number;
    public y: number;
    public state: AntState;
    public foodCarrying: boolean;
    public speed: number;
    public maxSpeed: number;
    public maxForce: number;
    public position: Vector2;
    public velocity: Vector2;
    public acceleration: Vector2;
    public goalReached: boolean = true;
    public suffocationFrames: number = 0;
    strongPheromoneTime: number = 50;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.state = AntState.FoodSearch;
        this.foodCarrying = false;
        this.speed = 0.05 + (Math.random() - 0.5) * 0.01;
        this.maxSpeed = 0.05 + (Math.random() - 0.5) * 0.01;
        this.maxForce = 2;
        this.position = new Vector2(x,y);
        this.velocity = new Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(this.speed);
        this.acceleration = new Vector2(0,0);
    }
    
    public switchState(): void {
        if (this.state === AntState.FoodSearch) {
            this.state = AntState.HomeSearch;
        } else {
            this.state = AntState.FoodSearch;
        }
    }

    public setFoodCarrying(carrying: boolean): void {
        this.foodCarrying = carrying;
        this.goalReached = true;
        this.acceleration.multiplyScalar(0);
        this.strongPheromoneTime = 100
        this.switchState();
    }

    public isSuffocating(gridService: GridService): boolean {
        if(this.isInsideObstacle(gridService)) {
            if(this.suffocationFrames > 50){
                return true;
            }
            this.suffocationFrames += Math.floor(Math.random() * 3);
        }
        else{
            this.suffocationFrames = Math.max(0,this.suffocationFrames-1);
        }
        return false;
    }

    public isInsideObstacle(gridService: GridService): boolean {
        const gridX = Math.floor(this.position.x);
        const gridY = Math.floor(this.position.y);
        const cell = gridService.getCell(gridX, gridY);
        if (cell && cell.type === CellType.Obstacle) {
            return true;
        }
        return false;
    }

//#region Movement

    moveToward(target: Vector2): Vector2 {
        const desired = target.clone().sub(this.position).normalize().multiplyScalar(this.maxSpeed);
        const steer = desired.sub(this.velocity).clampLength(0, this.maxForce);
        this.applyForce(steer);
        return desired;
    }

    followPheromones(cells: Cell[]): Vector2 {
        let desired = new Vector2(0, 0);
    
        if (cells.length === 0) {
            return desired;
        }
    
        let targetCell: Cell | undefined;
        let highestPheromoneValue = 0;
        let visionAngle = Math.PI / (this.goalReached ? 0.5 : 3);
    
        if (this.goalReached) {
            this.goalReached = false;
        }
        const cellWithMaxDistressPheromone = cells.reduce((maxCell, currentCell) => {
            let currentCellDistress = currentCell.pheromones.get(PheromoneType.DistressPheromone) as number;
            let maxCellDistress = maxCell.pheromones.get(PheromoneType.DistressPheromone) as number;
            return currentCellDistress > maxCellDistress ? currentCell : maxCell;
        });

        for (const cell of cells) {
            let pheromoneValue;
            if (this.state === AntState.FoodSearch) {
                pheromoneValue = cell.pheromones.get(PheromoneType.ReturnPheromone) as Vector2;
            } else if (this.state === AntState.HomeSearch) {
                pheromoneValue = cell.pheromones.get(PheromoneType.SearchPheromone) as Vector2;
            } else {
                continue;
            }

            let cellDistressPheromone = cell.pheromones.get(PheromoneType.DistressPheromone) as number;

            const cellCenter = new Vector2(cell.x + 0.5, cell.y + 0.5);
            const directionToCell = cellCenter.clone().sub(this.position).normalize();
            const angleToCell = this.velocity.angleTo(directionToCell);
    
            if (Math.abs(angleToCell) < visionAngle && pheromoneValue.length() - cellDistressPheromone > highestPheromoneValue) {
                highestPheromoneValue = pheromoneValue.length() - cellDistressPheromone;
                targetCell = cell;
            }
        }
    
        if (targetCell) {
            let targetPheromoneValue;
            let pheromoneValue;
            if (this.state === AntState.FoodSearch) {
                targetPheromoneValue = targetCell.pheromones.get(PheromoneType.ReturnPheromone) as Vector2;
                
            } else if (this.state === AntState.HomeSearch) {
                targetPheromoneValue = targetCell.pheromones.get(PheromoneType.SearchPheromone) as Vector2;
            } else {
                return desired;
            }
            pheromoneValue = targetPheromoneValue.clone().normalize().negate();
            const moveTarget = new Vector2((targetCell.x + (0.5)) + Math.random() - 0.5, (targetCell.y + (0.5)) + Math.random() - 0.5);
            const targetPosition = moveTarget.clone().add(pheromoneValue);
    
            desired.copy(this.moveToward(targetPosition));
        }
        
        let maxDistressValue = cellWithMaxDistressPheromone.pheromones.get(PheromoneType.DistressPheromone) as number;

        if (maxDistressValue >= 0.1) {
            const cellCenter = new Vector2(cellWithMaxDistressPheromone.x + 0.5, cellWithMaxDistressPheromone.y + 0.5);
            const directionAwayFromDistress = this.position.clone().sub(cellCenter).normalize();
            desired.add(directionAwayFromDistress.multiplyScalar(maxDistressValue));
        }
    
        return desired;
    }
    
    avoidPredators(predatorService: PredatorService, gridService: GridService, desiredVelocity: Vector2): void{
        if(Math.random() < 0.95){
            return;
        }
        const avoidRadius = 3;
        const forceMultiplier = 0.1;
        const lookaheadDistance = this.maxSpeed;
        const predictedPosition = this.position.clone().add(desiredVelocity.clone().normalize().multiplyScalar(lookaheadDistance));
        for (const predator of predatorService.predators) {
            const distanceToPredator = predictedPosition.distanceTo(predator.position);
            if (distanceToPredator <= avoidRadius) {
                let repulsionForce = predictedPosition.clone().sub(predator.position).normalize().multiplyScalar(forceMultiplier);
                this.layScalarPheromonesByType(gridService, PheromoneType.DistressPheromone, 0.75);
                repulsionForce = rotateVector(repulsionForce, (Math.random() - 0.5) * 2 * Math.PI * 0.055);
                this.applyForce(repulsionForce);
            }
        }
    }

    avoidObstacles(cells: Cell[], gridService: GridService, desiredVelocity: Vector2): void {
        const avoidRadius = 0.75;
        const forceMultiplier = 4;
        const lookaheadDistance = this.maxSpeed;
        const predictedPosition = this.position.clone().add(desiredVelocity.clone().normalize().multiplyScalar(lookaheadDistance));
        for (const cell of cells) {
            if (cell.type === CellType.Obstacle) {
                const cellCenter = new Vector2(cell.x + .5, cell.y + .5);
                const distanceToCell = predictedPosition.distanceTo(cellCenter);
                if (distanceToCell <= avoidRadius) {
                    this.layScalarPheromonesByType(gridService, PheromoneType.AvoidPheromone, 0.03);
                    let repulsionForce = predictedPosition.clone().sub(cellCenter).normalize().multiplyScalar(forceMultiplier);
                    repulsionForce = rotateVector(repulsionForce, (Math.random() - 0.5) * 2 * Math.PI * 0.055);
                    this.applyForce(repulsionForce);
                }
            }
        }
    }
    
    stayInBounds(width: number, height: number): void {
        const boundaryThreshold = this.speed * 2;
        const boundaryForce = new Vector2(0, 0);
      
        if (this.position.x < boundaryThreshold) {
            boundaryForce.x = boundaryThreshold - this.position.x;
        } else if (this.position.x > width - boundaryThreshold) {
            boundaryForce.x = -(boundaryThreshold - (width - this.position.x));
        }
      
        if (this.position.y < boundaryThreshold) {
            boundaryForce.y = boundaryThreshold - this.position.y;
        } else if (this.position.y > height - boundaryThreshold) {
            boundaryForce.y = -(boundaryThreshold - (height - this.position.y));
        }
      
        const limitedBoundaryForce = limitVector(boundaryForce, this.maxForce);
        this.applyForce(limitedBoundaryForce);
    }

    applyRandomSteering(): void {
        const randomSteeringAngle = (Math.random() - 0.5) * 2 * Math.PI * 0.055;
        const newDirection = rotateVector(this.velocity.clone(), randomSteeringAngle);
        const steeringForce = newDirection.sub(this.velocity);
    
        const limitedSteeringForce = limitVector(steeringForce, this.maxForce);
        this.applyForce(limitedSteeringForce);
    }

    applyForce(force: Vector2): void {   
        this.acceleration.add(force);
        this.velocity.add(this.acceleration)
        this.velocity = limitVector(this.velocity, this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);
    }

//#endregion

//#region Pheromones

    layVectorPheromones(gridService: GridService): void {
        const x = Math.floor(this.position.x);
        const y = Math.floor(this.position.y);
        const cell = gridService.getCell(x, y);

        if (cell === undefined || cell.type === CellType.Obstacle) {
            return;
        }

        if (this.strongPheromoneTime > 0) {
            if (this.state === AntState.FoodSearch) {
                let currentCellPheromone = cell.pheromones.get(PheromoneType.SearchPheromone) as Vector2;
                currentCellPheromone.add(this.velocity.clone().multiplyScalar(0.02)).clampLength(0,1);
            } else {
                let currentCellPheromone = cell.pheromones.get(PheromoneType.ReturnPheromone) as Vector2;
                currentCellPheromone.add(this.velocity.clone().multiplyScalar(0.02)).clampLength(0,1);
            }
            this.strongPheromoneTime -= 1;
        } else {
            if (this.state === AntState.FoodSearch) {
                let currentCellPheromone = cell.pheromones.get(PheromoneType.SearchPheromone) as Vector2;
                currentCellPheromone.add(this.velocity.clone().multiplyScalar(0.01)).clampLength(0,1);
            } else {
                let currentCellPheromone = cell.pheromones.get(PheromoneType.ReturnPheromone) as Vector2;
                currentCellPheromone.add(this.velocity.clone().multiplyScalar(0.01)).clampLength(0,1);
            }
        }
    }

    layScalarPheromonesByType(gridService: GridService, pheromoneType: PheromoneType, quantity: number): void {
        const currentCell = gridService.getCellAtPosition(this.position);
        if(currentCell === undefined || currentCell.type === CellType.Obstacle){
            return;
        }

        let currentCellPheromone = currentCell.pheromones.get(pheromoneType) as number;
        currentCellPheromone = Math.min(currentCellPheromone + quantity, 1);
        currentCell.pheromones.set(pheromoneType, currentCellPheromone);
    }

//#endregion

}