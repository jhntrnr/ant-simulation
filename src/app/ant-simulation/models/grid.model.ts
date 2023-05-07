import { Cell, CellType } from './cell.model';

export class Grid {
    private cells: Cell[][];
    cellSize!: number;
    constructor(public width: number, public height: number, cellSize: number = 10) {
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
                cell.searchPheromone = 0;
                cell.returnPheromone = 0;
                cell.avoidPheromone = 0;
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