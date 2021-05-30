import {AcState} from "./AcState";
import Slider from "./Slider";
import RadioButton from "./RadioButton";
import ReconnectingWebSocket from "reconnecting-websocket";

export default class App {
    private readonly websocket: ReconnectingWebSocket;
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
    private readonly loadingElement = document.querySelector<HTMLElement>('.loader');
    private readonly password: string;

    private state: AcState = null;
    private preventUpdate = false;

    constructor(password: string) {
        this.websocket = new ReconnectingWebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?password=${encodeURIComponent(password)}`);
        this.websocket.addEventListener('message', this.handleData.bind(this));
        this.password = password;
    }

    private async setMode(mode: string) {
        this.state.mode = mode as any;
        await this.sendUpdate();
    }

    private async setPower(fanSpeed: string) {
        if (fanSpeed === "off") {
            this.state.power = "off";
        } else {
            this.state.power = "on";
            this.state.fanSpeed = fanSpeed as any;
        }
        await this.sendUpdate();
    }

    private async setTemperature(temperature: number) {
        this.state.temp = temperature;
        await this.sendUpdate();
    }

    private handleData(event: MessageEvent) {
        if (this.preventUpdate) {
            return;
        }
        this.state = JSON.parse(event.data.toString());
        this.render();
    }

    private render() {
        this.slider.setValue(this.state.temp);
        this.mode.setValue(this.state.mode);
        if (this.state.power === "off") {
            this.power.setValue("off");
        } else {
            this.power.setValue(this.state.fanSpeed);
        }
        this.slider.render();
        this.loadingElement.style.visibility = this.state.applying ? "visible" : "hidden";
    }

    private async sendUpdate() {
        try {
            this.preventUpdate = true;
            await fetch(`/set?password=${encodeURIComponent(this.password)}&power=${this.state.power}&temp=${this.state.temp}&mode=${this.state.mode}&fan=${this.state.fanSpeed}`, {
                method: 'POST'
            });
        } catch (e) {
            console.warn("Send failed");
        } finally {
            setTimeout(() => this.preventUpdate = false, 500);
        }
    }
}