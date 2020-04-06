import App from "./App";

const password = window.location.hash.substr(1);
if (password) {
    window.onload = () => new App(password);
} else {
    window.onload = () => document.body.innerHTML = "Password required";
}