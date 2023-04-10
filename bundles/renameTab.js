'use strict';

const NAME_INPUT = document.getElementById("name");
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
            let oldName = event.data;
            NAME_INPUT.value = oldName;
            function confirm() {
                messagePort.postMessage(NAME_INPUT.value);
            }
            EXIT_BUTTON.addEventListener("click", () => {
                messagePort.postMessage(oldName);
            });
            CONFIRM_BUTTON.addEventListener("click", confirm);
            window.addEventListener("keydown", (event) => {
                if (event.code == "Enter")
                    confirm();
            });
        };
    }
});
