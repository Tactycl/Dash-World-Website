export default class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return `Vector2(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`;
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    mul(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    div(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    equals(other) {
        return this.x === other.x && this.y === other.y;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    normalized() {
        const mag = this.magnitude();
        return mag === 0 ? new Vector2(0, 0) : this.div(mag);
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
}