import { Vector2 } from "three";

import { AntService } from "../services/ant.service";

export enum CellType {
    AntSpawn = "Ant Spawn",
    FoodSpawn = "Food Cell",
    Obstacle = "Obstacle",
    Blank = "Blank",
}

export class Cell {
    public searchPheromone: number;
    public returnPheromone: number;
    public avoidPheromone: number;
    public position: Vector2;

    constructor(
        public x: number,
        public y: number,
        public type: CellType,
        searchPheromone: number = 0,
        returnPheromone: number = 0,
        avoidPheromone: number = 0,
    ) {
        this.searchPheromone = searchPheromone;
        this.returnPheromone = returnPheromone;
        this.avoidPheromone = avoidPheromone;
        this.position = new Vector2(x,y);
    }

    public updateCell(antService: AntService): void {
        switch(this.type){
            case (CellType.AntSpawn) :
                antService.createAnt(this.x, this.y);
                break;
            default:
                return;
        }
    }

    public static fromJson(json: any): Cell {
        return new Cell(
            json.x,
            json.y,
            json.type
        );
    }

}