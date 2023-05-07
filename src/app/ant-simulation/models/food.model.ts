import { Vector2 } from "three";

export class Food {
    public x: number;
    public y: number;
    public position: Vector2;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.position = new Vector2(x,y);
    }
}