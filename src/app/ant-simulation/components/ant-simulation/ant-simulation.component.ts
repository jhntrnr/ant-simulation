import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Vector2 } from 'three';

import { Cell, CellType, PheromoneType } from '../../models/cell.model';
import { GridService } from '../../services/grid.service';
import { AntService } from '../../services/ant.service';
import { PredatorService } from '../../services/predator.service';
import { FoodService } from '../../services/food.service';

enum ViewMode {
    PaintedPheromones = "Painted Pheromones",
    VectorPheromones = "Vector Pheromones",
    HidePheromones = "Hide Pheromones",
}

@Component({
  selector: 'app-ant-simulation',
  templateUrl: './ant-simulation.component.html',
  styleUrls: ['./ant-simulation.component.css'],
})
export class AntSimulationComponent implements OnInit, AfterViewInit {
    @ViewChild('simulationCanvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
    selectedCellType: CellType = CellType.Obstacle;
    cellTypes = Object.values(CellType).filter(v => typeof v === 'string');
    selectedPheromoneType: PheromoneType = PheromoneType.SearchPheromone;
    pheromoneTypes = Object.values(PheromoneType).filter(v => typeof v === 'string');
    amountOfPheromoneToPaint: number = 0.1;
    previousMousePosition!: Vector2;
    pheromoneDecayRate: number = 0.0015;
    pheromoneDiffusionRate: number = 0.3;
    pheromoneDiffusionAmount: number = 0.01;
    maxAnts: number = 50;
    maxPredators: number = 6;
    predatorLifespan: number = 50;
    antLifespan: number = 50;
    brushSize: number = 1;
    showingSearchingAnts: boolean = true;
    showingFoodCarryingAnts: boolean = true;
    showingPredators: boolean = true;
    showingSearchPheromone: boolean = true;
    showingReturnPheromone: boolean = true;
    showingDistressPheromone: boolean = true;
    viewMode: ViewMode = ViewMode.PaintedPheromones;
    visualPheromoneStrength: number = 50;
    tooltipCell!: Cell | null;
    tooltipStyle = {};
    cellType = '';
    pheromoneInfo: string[] = [];
    clearOptions = new FormControl();
    clearOptionsList: string[] = ['Ants', 'Search Pheromones', 'Return Pheromones', 'Distress Pheromones', 'Predators', 'Ant Spawn Cells', 'Predator Spawn Cells', 'Food Cells', 'Obstacle Cells', 'Everything'];
    private isDrawing: boolean = false;
    private running: boolean = true;
    private context!: CanvasRenderingContext2D;
    private cellSize!: number;
    constructor(private gridService: GridService, private antService: AntService, private predatorService: PredatorService, private foodService: FoodService) {}

    async ngOnInit(): Promise<void> {
        try {
            await this.gridService.loadDefaultGrid();
        } catch (err) {
            console.error('Error loading default grid:', err);
        }
        this.cellSize = this.gridService.grid.cellSize;
        this.antService.maxAnts = this.maxAnts;
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
        this.pheromoneDecayRate = event.value;
        this.gridService.pheromoneDecayRate = this.pheromoneDecayRate;
    }

    onPheromoneDiffusionRateChange(event: any): void {
        this.pheromoneDiffusionRate = event.value;
        this.gridService.pheromonediffusionInterval = this.pheromoneDiffusionRate * 1000;
    }

    onPheromoneDiffusionAmountChange(event: any): void {
        this.pheromoneDiffusionAmount = event.value;
        this.gridService.pheromoneDiffusionAmount = this.pheromoneDiffusionAmount;
    }

    onMaxAntsChange(event: any): void {
        this.maxAnts = event.value;
        this.antService.maxAnts = this.maxAnts;
    }

    onMaxPredatorsChange(event: any): void {
        this.maxPredators = event.value;
        this.predatorService.maxPredators = this.maxPredators;
    }

    onAntLifespanChange(event: any): void {
        this.antLifespan = event.value;

        const minValue = 0.01;
        const maxValue = 0;
        const middleValue = 0.0005;
        const middleSliderValue = 50;
      
        if (this.antLifespan === middleSliderValue) {
            this.antService.antLifespan = middleValue;
        } else if (this.antLifespan <= middleSliderValue) {
            this.antService.antLifespan = minValue + ((middleValue - minValue) / (middleSliderValue - 1)) * (this.antLifespan - 1);
        } else {
            this.antService.antLifespan = middleValue + ((maxValue - middleValue) / (100 - middleSliderValue)) * (this.antLifespan - middleSliderValue);
        }
    }

    onPredatorLifespanChange(event: any): void {
        this.predatorLifespan = event.value;

        const minValue = 0.1;
        const maxValue = 0;
        const middleValue = 0.005;
        const middleSliderValue = 50;
      
        if (this.predatorLifespan === middleSliderValue) {
            this.predatorService.predatorLifespan = middleValue;
        } else if (this.predatorLifespan <= middleSliderValue) {
            this.predatorService.predatorLifespan = minValue + ((middleValue - minValue) / (middleSliderValue - 1)) * (this.predatorLifespan - 1);
        } else {
            this.predatorService.predatorLifespan = middleValue + ((maxValue - middleValue) / (100 - middleSliderValue)) * (this.predatorLifespan - middleSliderValue);
        }
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
        this.drawPredators();
        this.updateTooltip();
        if (this.running){
            this.antService.updateAnts(this.predatorService);
            this.predatorService.updatePredators();
            this.gridService.updateGrid(this.antService, this.predatorService);
        }

        requestAnimationFrame(() => this.draw());
    }

    private drawGrid(): void {
        switch (this.viewMode){
            case ViewMode.PaintedPheromones:
                this.drawPaintedPheromones();
                break;
            case ViewMode.VectorPheromones:
                this.drawVectorField();
                break;
            default:
                this.drawNoPheromones();
                break;
        }
    }

    private drawPaintedPheromones(): void {
        for (let y = 0; y < this.gridService.height; y++) {
            for (let x = 0; x < this.gridService.width; x++) {
                const cell = this.gridService.getCell(x, y);
                if(cell !== undefined){
                    let searchPheromone = cell.pheromones.get(PheromoneType.SearchPheromone) as Vector2;
                    let returnPheromone = cell.pheromones.get(PheromoneType.ReturnPheromone) as Vector2;
                    let distressPheromone = cell.pheromones.get(PheromoneType.DistressPheromone) as number;
                    const red = this.showingSearchPheromone ? this.clampColorValue(1 - (searchPheromone.length() * this.visualPheromoneStrength)) : 255;
                    const blue = this.showingReturnPheromone ? this.clampColorValue(1 - (returnPheromone.length() * this.visualPheromoneStrength)) : 255;
                    const green = this.showingDistressPheromone ? this.clampColorValue(1 - distressPheromone) : 255;
                    let cellColor = `rgba(${red}, ${green}, ${blue}, 1)`;
                    if (cell.type === CellType.AntSpawn) {
                        cellColor = 'cadetblue';
                    } else if (cell.type === CellType.PredatorSpawn) {
                        cellColor = 'orange';
                    } else if (cell.type === CellType.FoodSpawn) {
                        cellColor = 'limegreen';
                    } else if (cell.type === CellType.Obstacle) {
                        cellColor = 'darkgray';
                    }
                    this.context.fillStyle = cellColor;
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    private drawVectorField(): void {
        const arrowSize = 5;
        for (let y = 0; y < this.gridService.height; y++) {
            for (let x = 0; x < this.gridService.width; x++) {
                const cell = this.gridService.getCell(x, y);
                if (cell === undefined) {
                    continue;
                }
                let cellColor = 'white';
                if(cell?.type === CellType.Blank){
                    const centerX = x * this.cellSize + this.cellSize / 2;
                    const centerY = y * this.cellSize + this.cellSize / 2;
                    if(this.showingSearchPheromone){
                        let searchPheromone = cell.pheromones.get(PheromoneType.SearchPheromone) as Vector2;
                        this.context.strokeStyle = 'darkblue';
                        this.drawArrow(centerX, centerY, searchPheromone, arrowSize);
                    }
                    if(this.showingReturnPheromone){
                        let returnPheromone = cell.pheromones.get(PheromoneType.ReturnPheromone) as Vector2;
                        this.context.strokeStyle = 'darkred';
                        this.drawArrow(centerX, centerY, returnPheromone, arrowSize);
                    }
                }
                else{
                    if (cell.type === CellType.AntSpawn) {
                        cellColor = 'cadetblue';
                    } else if (cell.type === CellType.PredatorSpawn) {
                        cellColor = 'orange';
                    } else if (cell.type === CellType.FoodSpawn) {
                        cellColor = 'limegreen';
                    } else if (cell.type === CellType.Obstacle) {
                        cellColor = 'darkgray';
                    }
                    this.context.fillStyle = cellColor;
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }
    
    private drawArrow(centerX: number, centerY: number, vector: Vector2, arrowSize: number): void {
        const arrowLength = vector.length() * this.visualPheromoneStrength;
        if(arrowLength <= 0.00001){
            return;
        }
        const arrowDirection = vector.clone().normalize();
        
        const endPointX = centerX + arrowDirection.x * arrowLength;
        const endPointY = centerY + arrowDirection.y * arrowLength;
        
        // Arrow body
        this.context.beginPath();
        this.context.moveTo(centerX, centerY);
        this.context.lineTo(endPointX, endPointY);
        this.context.stroke();
        
        // Arrowhead
        const arrowAngle = Math.atan2(arrowDirection.y, arrowDirection.x);
        const angle1 = arrowAngle + Math.PI / 6;
        const angle2 = arrowAngle - Math.PI / 6;
        
        this.context.beginPath();
        this.context.moveTo(endPointX, endPointY);
        this.context.lineTo(endPointX - arrowSize * Math.cos(angle1), endPointY - arrowSize * Math.sin(angle1));
        this.context.moveTo(endPointX, endPointY);
        this.context.lineTo(endPointX - arrowSize * Math.cos(angle2), endPointY - arrowSize * Math.sin(angle2));
        this.context.stroke();
    }

    private drawNoPheromones(): void {
        for (let y = 0; y < this.gridService.height; y++) {
            for (let x = 0; x < this.gridService.width; x++) {
                const cell = this.gridService.getCell(x, y);
                if(cell !== undefined){
                    let cellColor = 'white';
                    if (cell.type === CellType.AntSpawn) {
                        cellColor = 'cadetblue';
                    } else if (cell.type === CellType.PredatorSpawn) {
                        cellColor = 'orange';
                    } else if (cell.type === CellType.FoodSpawn) {
                        cellColor = 'limegreen';
                    } else if (cell.type === CellType.Obstacle) {
                        cellColor = 'darkgray';
                    }
                    this.context.fillStyle = cellColor;
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    clampColorValue(value: number, min: number = 0, max: number = 255): number {
        return Math.min(Math.max(value * 255, min * 255), max);
    }

    private drawAnts(): void {
        this.antService.ants.forEach(ant => {
            if(!this.showingFoodCarryingAnts && ant.foodCarrying){
                return;
            }
            if(!this.showingSearchingAnts && !ant.foodCarrying){
                return;
            }
            this.context.fillStyle = ant.foodCarrying  ? 'goldenrod' : 'white';
            this.context.strokeStyle = 'black';
            const x = ant.position.x * this.cellSize;
            const y = ant.position.y * this.cellSize;
            const radius = this.cellSize / 4;

            this.context.beginPath();
            this.context.arc(x, y, radius, 0, Math.PI * 2);
            this.context.fill();
            this.context.stroke();
        });
    }

    private drawPredators(): void {
        this.predatorService.predators.forEach(predator => {
            if(!this.showingPredators){
                return;
            }
            this.context.fillStyle = predator.foodCarrying  ? 'darkred' : 'red';
            this.context.strokeStyle = 'black';
            const x = predator.position.x * this.cellSize;
            const y = predator.position.y * this.cellSize;
            const radius = this.cellSize / 4;

            this.context.beginPath();
            this.context.arc(x, y, radius, 0, Math.PI * 2);
            this.context.fill();
            this.context.stroke();
        });
    }

    clearAllAnts(): void {
        if(this.clearOptions.value === null || this.clearOptions.value.length < 1){
            return;
        }
        if(this.clearOptions.value.includes('Ants') || this.clearOptions.value.includes('Everything')){
            this.antService.killAllAnts();
        }
        if(this.clearOptions.value.includes('Search Pheromones') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearPheromonesByType(PheromoneType.SearchPheromone);
        }
        if(this.clearOptions.value.includes('Return Pheromones') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearPheromonesByType(PheromoneType.ReturnPheromone);
        }
        if(this.clearOptions.value.includes('Distress Pheromones') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearPheromonesByType(PheromoneType.DistressPheromone);
        }
        if(this.clearOptions.value.includes('Predators') || this.clearOptions.value.includes('Everything')){
            this.predatorService.killAllPredators();
        }
        if(this.clearOptions.value.includes('Ant Spawn Cells') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearAllCellsOfType(CellType.AntSpawn);
        }
        if(this.clearOptions.value.includes('Predator Spawn Cells') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearAllCellsOfType(CellType.PredatorSpawn);
        }
        if(this.clearOptions.value.includes('Food Cells') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearAllCellsOfType(CellType.FoodSpawn);
        }
        if(this.clearOptions.value.includes('Obstacle Cells') || this.clearOptions.value.includes('Everything')){
            this.gridService.clearAllCellsOfType(CellType.Obstacle);
        }
        if(this.clearOptions.value.includes('Everything')){
            this.gridService.clearPheromonesByType(PheromoneType.AvoidPheromone);
        }
    }

    toggleSearchingAnts(event: MouseEvent): void {
        if(event.target instanceof Element){
            this.showingSearchingAnts = !this.showingSearchingAnts;
            event.target.textContent = this.showingSearchingAnts ? "Hide Searching Ants" : "Show Searching Ants";
        }
    }

    toggleFoodCarryingAnts(event: MouseEvent): void {
        if(event.target instanceof Element){
            this.showingFoodCarryingAnts = !this.showingFoodCarryingAnts;
            event.target.textContent = this.showingFoodCarryingAnts ? "Hide Returning Ants" : "Show Returning Ants";
        }
    }

    togglePredators(event: MouseEvent): void {
        if(event.target instanceof Element){
            this.showingPredators = !this.showingPredators;
            event.target.textContent = this.showingPredators ? "Hide Predators" : "Show Predators";
        }
    }

    toggleSearchPheromone(event: MouseEvent): void {
        if(event.target instanceof Element){
            this.showingSearchPheromone = !this.showingSearchPheromone;
            event.target.textContent = this.showingSearchPheromone ? "Hide Search Pheromone" : "Show Search Pheromone";
        }
    }

    toggleReturnPheromone(event: MouseEvent): void {
        if(event.target instanceof Element){
            this.showingReturnPheromone = !this.showingReturnPheromone;
            event.target.textContent = this.showingReturnPheromone ? "Hide Return Pheromone" : "Show Return Pheromone";
        }
    }

    toggleDistressPheromone(event: MouseEvent): void {
        if(event.target instanceof Element){
            this.showingDistressPheromone = !this.showingDistressPheromone;
            event.target.textContent = this.showingDistressPheromone ? "Hide Distress Pheromone" : "Show Distress Pheromone";
        }
    }

    onMouseDown(event: MouseEvent): void {
        this.isDrawing = true;
        if(event.shiftKey){
            this.previousMousePosition = new Vector2(event.clientX, event.clientY);
            this.paintPheromones(event.clientX, event.clientY);
        }
        else{
            this.paintCell(event.clientX, event.clientY);
        }
    }

    onMouseMove(event: MouseEvent): void {
        const rect = this.canvas.nativeElement.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / this.cellSize);
        const y = Math.floor((event.clientY - rect.top) / this.cellSize);
        const cell = this.gridService.getCell(x, y);
        if(cell){
            this.tooltipCell = cell;
            this.tooltipStyle = {
                display: 'block',
                left: `${event.clientX + 15}px`,
                top: `${event.clientY + 10}px`
            };
        }
        if (!this.isDrawing) return;
        if(event.shiftKey){
            this.paintPheromones(event.clientX, event.clientY);
        }
        else{
            this.paintCell(event.clientX, event.clientY);
        }
    }

    private updateTooltip(): void {
        if (this.tooltipCell) {
            this.cellType = `Cell Type: ${this.tooltipCell.type}`;
            this.pheromoneInfo = [];
            for (const pheromoneType in PheromoneType) {
                    if (Object.prototype.hasOwnProperty.call(PheromoneType, pheromoneType)) {
                        const key = PheromoneType[pheromoneType as keyof typeof PheromoneType];
                        const pheromoneValue = this.tooltipCell.pheromones.get(key);
                        if(pheromoneValue){
                            const value = typeof pheromoneValue === 'number' ? pheromoneValue : pheromoneValue.length();
                            if(value <= 0){
                                continue;
                            }
                            let valueString = value.toFixed(8);
                            if(value < 0.00001){
                                valueString = '< 0.00001';
                            }
                            this.pheromoneInfo.push(`${key}: ${valueString}`);
                        }
                    }
            }
        } else {
            this.tooltipStyle = { display: 'none' };
        }
    }

    onMouseUp(): void {
        this.isDrawing = false;
    }

    onMouseLeave(): void {
        this.isDrawing = false;
        this.tooltipCell = null;
    }

    private paintCell(clientX: number, clientY: number): void {
        const rect = this.canvas.nativeElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
    
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        if(this.selectedCellType === CellType.AntSpawn || this.selectedCellType === CellType.FoodSpawn || this.selectedCellType === CellType.PredatorSpawn){
            this.brushSize = 1;
        }
        const halfBrushSize = Math.floor(this.brushSize / 2);
        for (let i = -halfBrushSize; i < -halfBrushSize + this.brushSize; i++) {
            for (let j = -halfBrushSize; j < -halfBrushSize + this.brushSize; j++) {
                this.gridService.setCellType(cellX + i, cellY + j, this.selectedCellType);
            }
        }
    }    

    private paintPheromones(clientX: number, clientY: number): void {
        const rect = this.canvas.nativeElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
    
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);

        const halfBrushSize = Math.floor(this.brushSize / 2);
        for (let i = -halfBrushSize; i < -halfBrushSize + this.brushSize; i++) {
            for (let j = -halfBrushSize; j < -halfBrushSize + this.brushSize; j++) {
                let mouseDirection: Vector2 = new Vector2(clientX,clientY).sub(this.previousMousePosition).normalize();
                this.gridService.setCellPheromones(cellX + i, cellY + j, mouseDirection, this.selectedPheromoneType, this.amountOfPheromoneToPaint);
            }
        }
        this.previousMousePosition = new Vector2(clientX,clientY);
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

    viewModes(): ViewMode[] {
        return Object.values(ViewMode);
    }
}