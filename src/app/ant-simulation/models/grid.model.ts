import { Vector2 } from 'three';
import { Cell, CellType, PheromoneType } from './cell.model';

export class Grid {
    private cells: Cell[][];
    cellSize!: number;
    constructor(public width: number, public height: number, cellSize: number = 8) {
        this.cellSize = cellSize;
        this.cells = new Array(height).fill(null).map((_, y) =>
            new Array(width).fill(null).map((_, x) => new Cell(x, y, CellType.Blank))
        );
    }

    public getCell(x: number, y: number): Cell | undefined {
        if (this.isWithinBounds(x, y)) {
            return this.cells[y][x];
        }
        return undefined;
    }

    public setCell(x: number, y: number, cellType: CellType): void {
        if (this.isWithinBounds(x, y)) {
            this.cells[y][x] = new Cell(x, y, cellType);
        }
    }

    public setCellsFromJson(cellsJson: any[][]): void {
        this.cells = cellsJson.map(row => row.map(cellJson => Cell.fromJson(cellJson)));
    }

    public isWithinBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    public setAllPheromonesToZero(): void {
        this.cells.forEach((row: Cell[]) => {
            row.forEach((cell: Cell) => {
                for (const pheromoneType in PheromoneType) {
                    if (Object.prototype.hasOwnProperty.call(PheromoneType, pheromoneType)) {
                        const key = PheromoneType[pheromoneType as keyof typeof PheromoneType];
                        if (typeof(cell.pheromones.get(key)) === 'number') {
                            cell.pheromones.set(key, 0);
                        } else {
                            cell.pheromones.set(key, new Vector2(0, 0));
                        }
                    }
                }                  
            });
        });
    }

    public setAllPheromonesToZeroByType(pheromoneType: PheromoneType): void {
        this.cells.forEach((row: Cell[]) => {
            row.forEach((cell: Cell) => {
                if (typeof(cell.pheromones.get(pheromoneType)) === 'number') {
                    cell.pheromones.set(pheromoneType, 0);
                } else {
                    cell.pheromones.set(pheromoneType, new Vector2(0, 0));
                }
            });
        });
    }

    public setCellsOfTypeToBlank(cellType: CellType): void {
        this.cells.forEach((row: Cell[]) => {
            row.forEach((cell: Cell) => {
                if(cell.type === cellType){
                    cell.type = CellType.Blank;
                }
            });
        });
    }

    public setAllCellsToBlank(): void {
        this.cells.forEach((row: Cell[]) => {
            row.forEach((cell: Cell) => {
                cell.type = CellType.Blank;
            });
        });
    }

    public getCells(): Cell[][] {
        return this.cells;
    }
}