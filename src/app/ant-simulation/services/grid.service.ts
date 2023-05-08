import { Injectable, Inject} from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Vector2 } from 'three';

import { Grid } from '../models/grid.model';
import { Cell, CellType } from '../models/cell.model';
import { AntService } from './ant.service';
import { saveAs } from 'file-saver';

@Injectable({
    providedIn: 'root',
})
export class GridService {
    grid!: Grid;
    pheromoneDecayRate: number = 0.0015;
    private lastDiffusionTime: number = Date.now();
    private diffusionInterval: number = 100;
    constructor(private http: HttpClient, private location: Location) {}

    public initializeGrid(width: number, height: number, cellSize: number = 16): void {
        this.grid = new Grid(width, height, cellSize);
    }

    updateGrid(antService: AntService): void {
        this.dissipatePheromones(antService, this.pheromoneDecayRate);
        this.diffusePheromones();
    }

    public dissipatePheromones(antService: AntService, dissipationRate: number): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y);
                if (cell) {
                    cell.updateCell(antService); //Update the cells here to save iterating over the grid an additional time
                    cell.returnPheromone.multiplyScalar(Math.max(0, 1 - dissipationRate));
                    cell.searchPheromone.multiplyScalar(Math.max(0, 1 - dissipationRate));
                    if (cell.returnPheromone.length() < .0000001) {
                        cell.returnPheromone.set(0, 0);
                    }
                    if (cell.searchPheromone.length() < .0000001) {
                        cell.searchPheromone.set(0, 0);
                    }
                    cell.avoidPheromone = Math.max(0, cell.avoidPheromone - dissipationRate);
                }
            }
        }
    }
    
    diffusePheromones(): void {
        const diffusionRate = 0.01;
        const currentTime = Date.now();
        if (currentTime - this.lastDiffusionTime < this.diffusionInterval) {
            return;
        }
        this.lastDiffusionTime = currentTime;
    
        // Create a temporary grid to store the delta pheromone values after diffusion
        const tempGrid: Cell[][] = [];
        for (let y = 0; y < this.height; y++) {
            tempGrid[y] = [];
            for (let x = 0; x < this.width; x++) {
                tempGrid[y][x] = new Cell(x, y, CellType.Blank);
            }
        }
    
        // Iterate over all cells and calculate the pheromone diffusion values
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const currentCell = this.getCell(x, y);
                if (currentCell === undefined || currentCell.type != CellType.Blank) {
                    continue;
                }
                const neighbors = this.getNeighboringCells(x, y);
    
                for (const neighbor of neighbors) {
                    const searchPheromoneToDistribute = currentCell.searchPheromone.clone().multiplyScalar(diffusionRate);
                    const returnPheromoneToDistribute = currentCell.returnPheromone.clone().multiplyScalar(diffusionRate);
                    const totalAvoidPheromoneToDistribute = currentCell.avoidPheromone * diffusionRate;
    
                    const searchPheromoneToAdd = searchPheromoneToDistribute.clone().divideScalar(neighbors.length);
                    const returnPheromoneToAdd = returnPheromoneToDistribute.clone().divideScalar(neighbors.length);
                    const avoidPheromoneToAdd = totalAvoidPheromoneToDistribute / neighbors.length;
    
                    tempGrid[neighbor.y][neighbor.x].searchPheromone.add(searchPheromoneToAdd);
                    tempGrid[y][x].searchPheromone.sub(searchPheromoneToAdd);
    
                    tempGrid[neighbor.y][neighbor.x].returnPheromone.add(returnPheromoneToAdd);
                    tempGrid[y][x].returnPheromone.sub(returnPheromoneToAdd);
    
                    tempGrid[neighbor.y][neighbor.x].avoidPheromone += avoidPheromoneToAdd;
                    tempGrid[y][x].avoidPheromone -= avoidPheromoneToAdd;
                }
            }
        }
    
        // Apply the delta pheromone values to the original grid
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const currentCell = this.getCell(x, y);
                if (currentCell === undefined) {
                    continue;
                }
                currentCell.searchPheromone.add(tempGrid[y][x].searchPheromone);
                currentCell.returnPheromone.add(tempGrid[y][x].returnPheromone);
                currentCell.avoidPheromone += tempGrid[y][x].avoidPheromone;
            }
        }
    }
    
    getNeighboringCells(x: number, y: number): Cell[] {
        const neighboringCells: Cell[] = [];
    
        for (let yOffset = -1; yOffset <= 1; yOffset++) {
            for (let xOffset = -1; xOffset <= 1; xOffset++) {
                if (yOffset === 0 && xOffset === 0) {
                    continue;
                }
                const neighborX = x + xOffset;
                const neighborY = y + yOffset;
    
                if (this.isWithinBounds(neighborX, neighborY)) {
                    const neighbor = this.getCell(neighborX, neighborY);
                    if (neighbor && neighbor.type === CellType.Blank) {
                        neighboringCells.push(neighbor);
                    }
                }
            }
        }
    
        return neighboringCells;
    }
    
    public clearAllPheromones(): void {
        this.grid.setAllPheromonesToZero();
    }
    
    public getGrid(): Grid {
         return this.grid;
    }

    public getCellType(x: number, y: number): CellType | undefined {
        const cell = this.grid.getCell(x, y);
        return cell ? cell.type : undefined;
    }

    public setCellType(x: number, y: number, cellType: CellType): void {
        this.grid.setCell(x, y, cellType);
    }

    public getCell(x: number, y: number): Cell | undefined {
        const cell = this.grid.getCell(x, y);
        return cell;
    }

    getCellsInRange(position: Vector2, range: number): Cell[] {
        const cellsInRange: Cell[] = [];
        const startX = Math.max(Math.floor(position.x - range), 0);
        const startY = Math.max(Math.floor(position.y - range), 0);
        const endX = Math.min(Math.floor(position.x + range), this.width);
        const endY = Math.min(Math.floor(position.y + range), this.height);
    
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if(Math.abs(x) - Math.floor(position.x) === 0 && Math.abs(y) - Math.floor(position.y) === 0){
                    continue;
                }
                const cell = this.getCell(x,y);
                if(cell !== undefined){
                    const cellCenter = this.cellCenterCoordinates(cell);
                    const distanceToCell = position.distanceTo(new Vector2(cellCenter[0], cellCenter[1]));
                    if (distanceToCell <= range) {
                        cellsInRange.push(cell);
                    }
                }
            }
        }
        return cellsInRange;
    }

    getCellsInRangeLineOfSight(position: Vector2, range: number): Cell[] {
        const cellsInRange: Cell[] = [];
        const startX = Math.max(Math.floor(position.x - range), 0);
        const startY = Math.max(Math.floor(position.y - range), 0);
        const endX = Math.min(Math.floor(position.x + range), this.width);
        const endY = Math.min(Math.floor(position.y + range), this.height);
    
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (Math.abs(x) - Math.floor(position.x) === 0 && Math.abs(y) - Math.floor(position.y) === 0) {
                    continue;
                }
                const cell = this.getCell(x, y);
                if (cell !== undefined) {
                    const cellCenter = this.cellCenterCoordinates(cell);
                    const distanceToCell = position.distanceTo(new Vector2(cellCenter[0], cellCenter[1]));
                    if (distanceToCell <= range && this.lineOfSight(position, new Vector2(cellCenter[0], cellCenter[1]))) {
                        cellsInRange.push(cell);
                    }
                }
            }
        }
        return cellsInRange;
    }
    
    // Bresenham's line algorithm
    lineOfSight(start: Vector2, end: Vector2, thickness: number = 0): boolean {
        let x0 = Math.floor(start.x);
        let y0 = Math.floor(start.y);
        const x1 = Math.floor(end.x);
        const y1 = Math.floor(end.y);
    
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
    
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
    
        let err = dx - dy;
    
        while (true) {
            if (x0 === x1 && y0 === y1) {
                break;
            }
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
            // Check the current cell and neighboring cells for obstacles
            const cellsToCheck = this.getCellsAround(x0, y0, thickness);
            for (const cell of cellsToCheck) {
                if (cell && cell.type === CellType.Obstacle) {
                    return false;
                }
                if (cell && cell.avoidPheromone > 0.25){
                    return false;
                }
            }
        }
        return true;
    }
    
    getCellsAround(x: number, y: number, thickness: number): Cell[] {
        const cells: Cell[] = [];
        for (let i = -thickness; i <= thickness; i++) {
            for (let j = -thickness; j <= thickness; j++) {
                const cell = this.getCell(x + i, y + j);
                if (cell) {
                    cells.push(cell);
                }
            }
        }
        return cells;
    }

    public getCellAtPosition(position: Vector2): Cell | undefined{
        let intPosition = position.clone();
        intPosition.x = Math.floor(intPosition.x);
        intPosition.y = Math.floor(intPosition.y);
        const cell = this.getCell(intPosition.x, intPosition.y);
        return cell;
    }

    public cellCenterCoordinates(cell: Cell): number[]{
        const centerX = (cell.x + 0.5);
        const centerY = (cell.y + 0.5);
        return [centerX, centerY];
    }

    public isWithinBounds(x: number, y: number): boolean {
        return this.grid.isWithinBounds(x, y);
    }

    get width(): number {
        return this.grid.width;
    }

    get height(): number {
        return this.grid.height;
    }

    clearAllCells(): void {
        this.clearAllPheromones();
        this.grid.setAllCellsToBlank();
    }

    saveGridToFile(filename: string): void {
        const gridCopy = JSON.parse(JSON.stringify(this.grid.getCells()));
        type CellMirror = { x: number,
            y: number,
            type: CellType,
            searchPheromone?: Vector2,
            returnPheromone?: Vector2,
            avoidPheromone?: number}
        gridCopy.forEach((row: Cell[], rowIndex: number) => {
            row.forEach((cell: Cell, colIndex: number) => {
                const mirroredCell = cell as CellMirror;
                delete mirroredCell.searchPheromone;
                delete mirroredCell.returnPheromone;
                delete mirroredCell.avoidPheromone;
                gridCopy[rowIndex][colIndex] = mirroredCell;
            });
        });
        const gridData = JSON.stringify({ ...this.grid, cells: gridCopy });
        const blob = new Blob([gridData], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${filename}.json`);
    }

    public async loadDefaultGrid(): Promise<void> {
        const file = await this.http
          .get(this.location.prepareExternalUrl('assets/default_grid.json'), { responseType: 'text' })
          .toPromise() as string;
        await this.loadGridFromFileContent(file);
    }

    async loadGridFromFile(file: File): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided.'));
            }
            const fileReader = new FileReader();
            fileReader.onload = async (event: ProgressEvent<FileReader>) => {
                if (event.target && event.target.result) {
                    const gridData = event.target.result as string;
                    await this.loadGridFromFileContent(gridData);
                    resolve();
                } else {
                    reject(new Error('Error reading file.'));
                }
            };
        
            fileReader.onerror = () => {
                reject(new Error('Error reading file.'));
            };
        
            fileReader.readAsText(file);
        });
    }
      

    private async loadGridFromFileContent(fileContent: string): Promise<void> {
        const gridJSON = JSON.parse(fileContent);
        this.grid = Object.assign(new Grid(0, 0, 0), gridJSON);
        this.grid.setCellsFromJson(gridJSON.cells);
        this.grid.setAllPheromonesToZero();
    }
}