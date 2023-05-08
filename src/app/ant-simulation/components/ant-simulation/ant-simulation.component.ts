import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

import { CellType } from '../../models/cell.model';
import { GridService } from '../../services/grid.service';
import { AntService } from '../../services/ant.service';
import { FoodService } from '../../services/food.service';

@Component({
  selector: 'app-ant-simulation',
  templateUrl: './ant-simulation.component.html',
  styleUrls: ['./ant-simulation.component.css'],
})
export class AntSimulationComponent implements OnInit, AfterViewInit {
    @ViewChild('simulationCanvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
    selectedCellType: CellType = CellType.Obstacle;
    cellTypes = Object.values(CellType).filter(v => typeof v === 'string');
    pheromoneDecayRate: number = 0.0005;
    brushSize: number = 1;
    showingSearchingAnts: boolean = true;
    showingFoodCarryingAnts: boolean = true;
    private isDrawing: boolean = false;
    private running: boolean = true;
    private context!: CanvasRenderingContext2D;
    private cellSize!: number;
    constructor(private gridService: GridService, private antService: AntService, private foodService: FoodService) {}

    async ngOnInit(): Promise<void> {
        try {
          await this.gridService.loadDefaultGrid();
        } catch (err) {
          console.error('Error loading default grid:', err);
        }
        this.cellSize = this.gridService.grid.cellSize;
    }

    async ngAfterViewInit(): Promise<void> {
        await this.gridService.loadDefaultGrid();
        this.initializeCanvas();
    }

    private initializeCanvas(): void {
        this.context = this.canvas.nativeElement.getContext('2d')!;
        this.canvas.nativeElement.width = this.gridService.width * this.cellSize;
        this.canvas.nativeElement.height = this.gridService.height * this.cellSize;
        
        requestAnimationFrame(() => this.draw());
    }
      

    onPheromoneDecayChange(event: any): void {
        this.pheromoneDecayRate = event.target.value;
        this.gridService.pheromoneDecayRate = this.pheromoneDecayRate;
    }

    startSimulation(): void {
        if(this.running) return;
        this.running = true;
    }

    stopSimulation(): void {
        this.running = false;
    }

    clearGrid(): void {
        this.clearAllAnts();
        this.gridService.clearAllCells();
    }

    private draw(): void {
        this.context.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        this.drawGrid();
        this.drawAnts();
        if (this.running){
            this.antService.updateAnts();
            this.gridService.updateGrid(this.antService);
        }

        requestAnimationFrame(() => this.draw());
    }

    private drawGrid(): void {
        for (let y = 0; y < this.gridService.height; y++) {
            for (let x = 0; x < this.gridService.width; x++) {
                const cell = this.gridService.getCell(x, y);
                if(cell !== undefined){
                    const red = this.clampColorValue(1 - cell.searchPheromone);
                    const blue = this.clampColorValue(1 - cell.returnPheromone);
                    const green = this.clampColorValue(1 - cell.avoidPheromone);
                    let cellColor = `rgba(${red}, ${green}, ${blue}, 1)`;
                    if (cell.type === CellType.AntSpawn) {
                        cellColor = 'red';
                    } else if (cell.type === CellType.FoodSpawn) {
                        cellColor = 'green';
                    } else if (cell.type === CellType.Obstacle) {
                        cellColor = 'darkgray';
                    }
                    this.context.fillStyle = cellColor;
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    private drawAnts(): void {
        this.antService.ants.forEach(ant => {
            if(!this.showingFoodCarryingAnts && ant.foodCarrying){
                return;
            }
            if(!this.showingSearchingAnts && !ant.foodCarrying){
                return;
            }
            this.context.fillStyle = ant.foodCarrying  ? 'red' : 'black';
            const x = ant.position.x * this.cellSize;
            const y = ant.position.y * this.cellSize;
            const radius = this.cellSize / 4;

            this.context.beginPath();
            this.context.arc(x, y, radius, 0, Math.PI * 2);
            this.context.fill();
        });
    }

    clampColorValue(value: number, min: number = 0, max: number = 255): number {
        return Math.min(Math.max(value * 255, min * 255), max);
    }

    clearAllAnts(): void {
        this.gridService.clearAllPheromones();
        this.antService.killAllAnts();
    }

    toggleSearchingAnts(): void{
        this.showingSearchingAnts = !this.showingSearchingAnts;
    }

    toggleFoodCarryingAnts(): void{
        this.showingFoodCarryingAnts = !this.showingFoodCarryingAnts;
    }

    onMouseDown(event: MouseEvent): void {
        this.isDrawing = true;
        this.drawCell(event.clientX, event.clientY);
    }

    onMouseMove(event: MouseEvent): void {
        if (!this.isDrawing) return;
        this.drawCell(event.clientX, event.clientY);
    }

    onMouseUp(): void {
        this.isDrawing = false;
    }

    private drawCell(clientX: number, clientY: number): void {
        const rect = this.canvas.nativeElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
    
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        if(this.selectedCellType === CellType.AntSpawn || this.selectedCellType === CellType.FoodSpawn){
            this.brushSize = 1;
        }
        for (let i = -Math.floor(this.brushSize / 2); i <= Math.floor(this.brushSize / 2); i++) {
            for (let j = -Math.floor(this.brushSize / 2); j <= Math.floor(this.brushSize / 2); j++) {
                this.gridService.setCellType(cellX + i, cellY + j, this.selectedCellType);
            }
        }
    }

    saveGrid(): void {
        const filename = 'ant_grid';
        this.gridService.saveGridToFile(filename);
    }
    
    loadGrid(event: Event): void {
        this.stopSimulation();
        this.clearGrid();
        const inputElement = event.target as HTMLInputElement;
        if (inputElement.files && inputElement.files.length > 0) {
            const file = inputElement.files[0];
            
            this.gridService.loadGridFromFile(file)
                .then(() => {
                    console.log('Grid loaded successfully');
                    this.startSimulation();
                })
                .catch((error) => {
                    console.error('Error loading grid:', error);
                });
        }
    }

}