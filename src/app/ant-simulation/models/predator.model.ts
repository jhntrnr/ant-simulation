import { Vector2 } from 'three';
import { GridService } from '../services/grid.service';
import { limitVector, rotateVector } from '../utils/vector-utils';
import { Cell, CellType } from './cell.model';

export enum PredatorState {
    PreySearch,
    Feeding,
}

export class Predator {
    public x: number;
    public y: number;
    public state: PredatorState;
    public foodCarrying: boolean;
    public speed: number;
    public maxSpeed: number;
    public maxForce: number;
    public position: Vector2;
    public velocity: Vector2;
    public acceleration: Vector2;
    public goalReached: boolean = true;
    public feedingTime: number = 0;
    public digestionTime: number = 100;
    strongPheromoneTime: number = 50;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.state = PredatorState.PreySearch;
        this.foodCarrying = false;
        this.speed = 0.01 + (Math.random() - 0.5) * 0.01;
        this.maxSpeed = 0.01 + (Math.random() - 0.5) * 0.01;
        this.maxForce = 2;
        this.position = new Vector2(x,y);
        this.velocity = new Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(this.speed);
        this.acceleration = new Vector2(0,0);
    }
    
    public switchState(): void {
        if (this.state === PredatorState.PreySearch) {
            this.state = PredatorState.Feeding;
            this.acceleration.multiplyScalar(0);
            this.velocity.multiplyScalar(0);
        } else {
            this.state = PredatorState.PreySearch;
            this.velocity = new Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(this.speed);
        }
    }

    public setFoodCarrying(carrying: boolean): void {
        this.foodCarrying = carrying;
        this.goalReached = true;
        this.strongPheromoneTime = 100
        this.switchState();
    }

//#region Movement

    moveToward(target: Vector2): Vector2 {
        const desired = target.clone().sub(this.position).normalize().multiplyScalar(this.maxSpeed);
        const steer = desired.sub(this.velocity).clampLength(0, this.maxForce);
        this.applyForce(steer);
        return desired;
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

}