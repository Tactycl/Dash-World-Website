export default class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toString() {
        return `Vector3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
    }

    add(other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    sub(other) {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    mul(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    div(scalar) {
        return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    equals(other) {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    normalized() {
        const mag = this.magnitude();
        return mag === 0 ? new Vector3(0, 0, 0) : this.div(mag);
    }

    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    cross(other) {
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }
}