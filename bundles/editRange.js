'use strict';

function cleanFloat(float) {
    let output = Math.round(float * 1e6) / 1e6;
    if (output == -0)
        output = 0;
    return output;
}

const MIN_INPUT = document.getElementById("min");
const MAX_INPUT = document.getElementById("max");
const EXIT_BUTTON = document.getElementById("exit");
const CONFIRM_BUTTON = document.getElementById("confirm");
window.addEventListener("message", (event) => {
    if (event.source == window && event.data == "port") {
        let messagePort = event.ports[0];
        messagePort.onmessage = (event) => {
            if (typeof event.data === "object" && "isFocused" in event.data) {
                Array.from(document.getElementsByTagName("button")).forEach((button) => {
                    if (event.data.isFocused) {
                        button.classList.remove("blurred");
                    }
                    else {
                        button.classList.add("blurred");
                    }
                });
                return;
            }
            let range = event.data;
            MIN_INPUT.value = cleanFloat(range[0]).toString();
            MAX_INPUT.value = cleanFloat(range[1]).toString();
            function confirm() {
                let min = Number(MIN_INPUT.value);
                let max = Number(MAX_INPUT.value);
                if (min >= max) {
                    alert("Maximum must be greater than minimum.");
                }
                else {
                    messagePort.postMessage([min, max]);
                }
            }
            EXIT_BUTTON.addEventListener("click", () => {
                messagePort.postMessage(range);
            });
            CONFIRM_BUTTON.addEventListener("click", confirm);
            window.addEventListener("keydown", (event) => {
                if (event.code == "Enter")
                    confirm();
            });
        };
    }
});
