import { Injectable } from '@angular/core';
import { Vector2 } from 'three';

import { Food } from '../models/food.model';

@Injectable({
    providedIn: 'root',
})

export class FoodService {
    foods: Food[] = [];

    constructor() {}

    public createFood(x: number, y: number): void {
        // Create a food. Food position is a relic from an earlier version; preserving in case foods become objects in the future
        const food = new Food((x + (0.5)) + Math.random() - 0.5, (y + (0.5)) + Math.random() - 0.5);
        this.foods.push(food);
    }

    public getFoods(): Food[] {
        return this.foods;
    }

    getFoodsInRange(position: Vector2, range: number): Food[] {
        return this.foods.filter(food => {
            const distanceToFood = position.distanceTo(food.position);
            return distanceToFood <= range;
        });
    }
}
