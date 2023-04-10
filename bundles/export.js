'use strict';

const HELP_URL = "https://github.com/Mechanical-Advantage/AdvantageScope/blob/main/docs/EXPORT.md";
const FORMAT = document.getElementById("format");
const SAMPLING_MODE = document.getElementById("samplingMode");
const SAMPLING_PERIOD = document.getElementById("samplingPeriod");
const PREFIXES = document.getElementById("prefixes");
const EXIT_BUTTON = document.getElementById("exit");
const CONFIRM_BUTTON = document.getElementById("confirm");
const HELP_BUTTON = document.getElementsByClassName("help-div")[0].firstElementChild;
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
        };
        function confirm() {
            let format = "csv-table";
            if (FORMAT.value == "csv-table")
                format = "csv-table";
            if (FORMAT.value == "csv-list")
                format = "csv-list";
            if (FORMAT.value == "wpilog")
                format = "wpilog";
            let samplingMode = "all";
            if (SAMPLING_MODE.value == "all")
                samplingMode = "all";
            if (SAMPLING_MODE.value == "fixed")
                samplingMode = "fixed";
            let options = {
                format: format,
                samplingMode: samplingMode,
                samplingPeriod: Number(SAMPLING_PERIOD.value),
                prefixes: PREFIXES.value
            };
            messagePort.postMessage(options);
        }
        function updateDisabled() {
            SAMPLING_MODE.disabled = FORMAT.value != "csv-table";
            SAMPLING_PERIOD.disabled = FORMAT.value != "csv-table" || SAMPLING_MODE.value != "fixed";
        }
        FORMAT.addEventListener("change", updateDisabled);
        SAMPLING_MODE.addEventListener("change", updateDisabled);
        updateDisabled();
        SAMPLING_PERIOD.addEventListener("change", () => {
            if (Number(SAMPLING_PERIOD.value) <= 0) {
                SAMPLING_PERIOD.value = "1";
            }
        });
        EXIT_BUTTON.addEventListener("click", () => {
            messagePort.postMessage(null);
        });
        CONFIRM_BUTTON.addEventListener("click", confirm);
        window.addEventListener("keydown", (event) => {
            if (event.code == "Enter")
                confirm();
        });
        HELP_BUTTON.addEventListener("click", () => {
            messagePort.postMessage(HELP_URL);
        });
    }
});
