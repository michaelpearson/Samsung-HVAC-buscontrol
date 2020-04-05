import {AcState} from "./AcState";
import Slider from "./Slider";
import RadioButton from "./RadioButton";
import ReconnectingWebSocket from "reconnecting-websocket";

export default class App {
    private readonly websocket = new ReconnectingWebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`);
    private readonly slider = new Slider(document.querySelector<HTMLCanvasElement>('#dial'), {
        min: 18,
        max: 30,
        angleOffset: 160,
        angleRange: 220,
        lineWidth: 30,
        touchMarginFactor: 3,
        unit: "°c",
        step: 1,
        fontSize: 120,
    }, this.setTemperature.bind(this));
    private readonly mode = new RadioButton(document.querySelectorAll('.mode-option'), "data-mode", this.setMode.bind(this));
    private readonly power = new RadioButton(document.querySelectorAll('.power-option'), "data-power", this.setPower.bind(this));

    private state: AcState = null;
    private displayState: AcState = null;
    private updateTimer: number = null;

    constructor() {
        this.websocket.addEventListener('message', this.handleData.bind(this));
    }

    private async setMode(mode: string) {
        this.displayState.mode = mode as any;
        if (this.displayState.power == "off") {
            this.displayState.power = "on";
            this.render();
        }
        await this.sendUpdate();
    }

    private async setPower(fanSpeed: string) {
        if (fanSpeed === "off") {
            this.displayState.power = "off";
        } else {
            this.displayState.power = "on";
            this.displayState.fanSpeed = fanSpeed as any;
        }
        await this.sendUpdate();
    }

    private async setTemperature(temperature: number) {
        this.displayState.temp = temperature;
        await this.sendUpdate();
    }

    private handleData(event: MessageEvent) {
        this.state = JSON.parse(event.data.toString());
        if (this.displayState == null || !this.updateTimer) {
            this.displayState = {...this.state};
            this.render();
        }
    }

    private render() {
        this.slider.setValue(this.displayState.temp);
        this.mode.setValue(this.displayState.mode);
        if (this.displayState.power === "off") {
            this.power.setValue("off");
        } else {
            this.power.setValue(this.displayState.fanSpeed);
        }
        this.slider.render();
    }

    private async sendUpdate() {
        window.clearTimeout(this.updateTimer);
        this.updateTimer = null;
        this.updateTimer = window.setTimeout(() => {
            if (this.displayState != this.state) {
                this.displayState = {...this.state};
                this.render()
            }
        }, 5000);
        await fetch(`/set?power=${this.displayState.power}&temp=${this.displayState.temp}&mode=${this.displayState.mode}&fan=${this.displayState.fanSpeed}`, {
            method: 'POST'
        });
    }
}