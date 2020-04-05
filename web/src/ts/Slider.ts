interface SliderSettings {
    min: number,
    max: number,
    angleOffset: number,
    angleRange: number,
    lineWidth: number,
    touchMarginFactor: number,
    unit: string,
    step: number,
    fontSize: number
}

export default class Slider {
    private readonly element: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly setting: SliderSettings;
    private readonly callback: (value: number) => void;

    private value: number;
    private mouseDown = false;

    constructor(element: HTMLCanvasElement, settings: SliderSettings, callback: (value: number) => void) {
        this.element = element;
        this.ctx = this.element.getContext("2d");
        this.setting = settings;
        this.callback = callback;

        document.addEventListener('pointermove', this.pointerMove.bind(this));
        document.addEventListener('pointerdown', this.pointerDown.bind(this));
        document.addEventListener('pointerup', this.pointerUp.bind(this));
    }

    private parsePointerEvent(event: PointerEvent) {
        let mouseX = event.clientX - this.element.offsetLeft, mouseY = event.clientY - this.element.offsetTop;
        let width = this.element.clientWidth, height = this.element.clientHeight;
        let centerX = width / 2, centerY = height / 2;
        let relativeX = mouseX - centerX, relativeY = centerY - mouseY;
        let angle = (-Math.atan2(relativeY, relativeX) * 180 / Math.PI) % 360;
        if (angle < 0) {
            angle += 360;
        }
        let adjustedAngle = (angle - this.setting.angleOffset);
        if (adjustedAngle < 0) {
            adjustedAngle += 360;
        }
        let percentage = adjustedAngle / this.setting.angleRange;
        let value = percentage * (this.setting.max - this.setting.min) + this.setting.min;

        let radius = Math.sqrt(Math.pow(relativeX, 2) + Math.pow(relativeY, 2));
        let innerRadius = width / 2 - this.setting.lineWidth * this.setting.touchMarginFactor + this.setting.lineWidth / 2;
        let outerRadius = innerRadius + this.setting.lineWidth * this.setting.touchMarginFactor;
        let inRange = !(value > this.setting.max || value < this.setting.min);
        let inTrack = !(radius < innerRadius || radius > outerRadius);
        return {valid: inRange && inTrack, inRange, inTrack, value};
    }

    private pointerDown(event: PointerEvent) {
        let {valid} = this.parsePointerEvent(event);
        if (valid) {
            this.mouseDown = true;
            this.pointerMove(event);
        }
    }

    private pointerUp(event: PointerEvent) {
        let fireEvent = this.mouseDown;
        this.mouseDown = false;
        this.pointerMove(event);
        if (fireEvent) {
            this.callback(this.getValue());
        }
    }

    private pointerMove(event: PointerEvent) {
        if (!this.mouseDown) {
            return;
        }
        let {value, inRange} = this.parsePointerEvent(event);
        if (inRange) {
            this.setValue(value);
        }

        this.render();
    }

    public setValue(value: number) {
        this.value = value;
    }

    public getValue(): number {
        return Math.round(this.value / this.setting.step) * this.setting.step;
    }

    public render() {
        let width = this.element.width, height = this.element.height;
        let radius = width / 2 - this.setting.lineWidth / 2;
        let x = width / 2;
        let y = height / 2;
        let percentage = (this.value - this.setting.min) / (this.setting.max - this.setting.min);
        let startAngle = (Math.PI / 180) * this.setting.angleOffset;
        let endAngle = startAngle + (Math.PI / 180) * this.setting.angleRange * percentage;

        this.ctx.clearRect(0, 0, width, height);

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.lineWidth = this.setting.lineWidth;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.stroke();

        let gradient = this.ctx.createLinearGradient(0, 500, 0, 0);
        gradient.addColorStop(0, "#c0e674");
        gradient.addColorStop(1, "#40d6a5");

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle);
        this.ctx.lineWidth = this.setting.lineWidth;
        this.ctx.strokeStyle = gradient;
        this.ctx.lineCap = "round";
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.lineWidth = 1;
        this.ctx.font = `${this.setting.fontSize}px Arial`;
        let text = `${this.getValue()}${this.setting.unit}`;
        let textSize = this.ctx.measureText(text);
        this.ctx.fillText(text, x - textSize.width / 2, y - 20);
        this.ctx.stroke();
    }
}