export interface AcState {
    power: "on" | "off",
    temp: number,
    fanSpeed: "low" | "medium" | "high" | "auto",
    mode: "fan" | "dry" | "heat" | "cool" | "auto"
}