export default class Color3 {
    constructor(r, g, b) {
        this.r = Color3._clamp(r);
        this.g = Color3._clamp(g);
        this.b = Color3._clamp(b);
    }

    static fromRGB(r, g, b) {
        return new Color3(r / 255, g / 255, b / 255);
    }

    toRGB() {
        return [
            Math.round(this.r * 255),
            Math.round(this.g * 255),
            Math.round(this.b * 255),
        ];
    }

    toHex() {
        const [r, g, b] = this.toRGB();
        return ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toLowerCase();
    }

    toString() {
        return `Color3(${this.r.toFixed(3)}, ${this.g.toFixed(3)}, ${this.b.toFixed(3)})`;
    }

    static _clamp(value) {
        return Math.max(0, Math.min(1, value));
    }
}