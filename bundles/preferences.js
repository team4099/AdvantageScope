'use strict';

const THEME = document.getElementById("theme");
const RIO_ADDRESS = document.getElementById("rioAddress");
const RIO_PATH = document.getElementById("rioPath");
const LIVE_MODE = document.getElementById("liveMode");
const LIVE_SUBSCRIBE_MODE = document.getElementById("liveSubscribeMode");
const RLOG_PORT = document.getElementById("rlogPort");
const THREE_DIMENSION_MODE = document.getElementById("threeDimensionMode");
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
            let platform = event.data.platform;
            let oldPrefs = event.data.prefs;
            if (platform == "linux") {
                THEME.children[0].hidden = true;
                THEME.children[1].innerText = "Light";
                THEME.children[2].innerText = "Dark";
            }
            THEME.value = oldPrefs.theme;
            RIO_ADDRESS.value = oldPrefs.rioAddress;
            RIO_PATH.value = oldPrefs.rioPath;
            LIVE_MODE.value = oldPrefs.liveMode;
            LIVE_SUBSCRIBE_MODE.value = oldPrefs.liveSubscribeMode;
            RLOG_PORT.value = oldPrefs.rlogPort.toString();
            THREE_DIMENSION_MODE.value = oldPrefs.threeDimensionMode;
            function close(useNewPrefs) {
                if (useNewPrefs) {
                    let theme = "system";
                    if (THEME.value == "light")
                        theme = "light";
                    if (THEME.value == "dark")
                        theme = "dark";
                    if (THEME.value == "system")
                        theme = "system";
                    let liveMode = "nt4";
                    if (LIVE_MODE.value == "nt4")
                        liveMode = "nt4";
                    if (LIVE_MODE.value == "nt4-akit")
                        liveMode = "nt4-akit";
                    if (LIVE_MODE.value == "rlog")
                        liveMode = "rlog";
                    let liveSubscribeMode = "low-bandwidth";
                    if (LIVE_SUBSCRIBE_MODE.value == "low-bandwidth")
                        liveSubscribeMode = "low-bandwidth";
                    if (LIVE_SUBSCRIBE_MODE.value == "logging")
                        liveSubscribeMode = "logging";
                    let threeDimensionMode = "quality";
                    if (THREE_DIMENSION_MODE.value == "quality")
                        threeDimensionMode = "quality";
                    if (THREE_DIMENSION_MODE.value == "efficiency")
                        threeDimensionMode = "efficiency";
                    if (THREE_DIMENSION_MODE.value == "auto")
                        threeDimensionMode = "auto";
                    let newPrefs = {
                        theme: theme,
                        rioAddress: RIO_ADDRESS.value,
                        rioPath: RIO_PATH.value,
                        liveMode: liveMode,
                        liveSubscribeMode: liveSubscribeMode,
                        rlogPort: Number(RLOG_PORT.value),
                        threeDimensionMode: threeDimensionMode
                    };
                    messagePort.postMessage(newPrefs);
                }
                else {
                    messagePort.postMessage(oldPrefs);
                }
            }
            EXIT_BUTTON.addEventListener("click", () => {
                close(false);
            });
            CONFIRM_BUTTON.addEventListener("click", () => close(true));
            window.addEventListener("keydown", (event) => {
                if (event.code == "Enter")
                    close(true);
            });
        };
    }
});
