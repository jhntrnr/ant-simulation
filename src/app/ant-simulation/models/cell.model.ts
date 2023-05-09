import { Vector2 } from "three";

import { AntService } from "../services/ant.service";
import { PredatorService } from "../services/predator.service";

export enum CellType {
    AntSpawn = "Ant Spawn",
    PredatorSpawn = "Predator Spawn",
    FoodSpawn = "Food Cell",
    Obstacle = "Obstacle",
    Blank = "Blank",
}

export enum PheromoneType {
    SearchPheromone = "Search Pheromone",
    ReturnPheromone = "Return Pheromone",
    AvoidPheromone = "Avoid Pheromone",
    DistressPheromone = "Distress Pheromone",
}

export class Cell {
    public pheromones: Map<PheromoneType, Vector2 | number>;
    public position: Vector2;

    constructor(
        public x: number,
        public y: number,
        public type: CellType,
        searchPheromone: Vector2 = new Vector2(0,0),
        returnPheromone: Vector2 = new Vector2(0,0),
        avoidPheromone: number = 0,
        distressPheromone: number = 0,
    ) {
        this.pheromones = new Map<PheromoneType, Vector2 | number>([
            [PheromoneType.SearchPheromone, searchPheromone],
            [PheromoneType.ReturnPheromone, returnPheromone],
            [PheromoneType.AvoidPheromone, avoidPheromone],
            [PheromoneType.DistressPheromone, distressPheromone],
        ])
        this.position = new Vector2(x,y);
    }

    public updateCell(antService: AntService, predatorService: PredatorService): void {
        switch(this.type){
            case (CellType.AntSpawn) :
                antService.createAnt(this.x, this.y);
                break;
            case (CellType.PredatorSpawn) : 
                predatorService.createPredator(this.x, this.y);
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