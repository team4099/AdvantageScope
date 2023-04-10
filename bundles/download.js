'use strict';

const USB_ADDRESS = "172.22.11.2";

function zfill(number, length) {
    while (number.length < length) {
        number = "0" + number;
    }
    return number;
}

const FILE_LIST = document.getElementsByClassName("file-list")[0];
const FILE_LIST_ITEMS = FILE_LIST.children[0];
const LOADING_ANIMATION = document.getElementsByClassName("loading")[0];
const ALERT_TEXT = document.getElementsByClassName("alert-text")[0];
const PROGRESS_BAR = document.getElementsByTagName("progress")[0];
const PROGRESS_DETAILS = document.getElementsByClassName("progress-details")[0];
const EXIT_BUTTON = document.getElementById("exit");
const DOWNLOAD_BUTTON = document.getElementById("download");
const FILE_ITEM_HEIGHT_PX = 25;
const BOTTOM_FILLER_MARGIN_PX = 5;
let messagePort = null;
let platform = "";
let preferences = null;
let lastAddress = "";
let loading = true;
let startTime = null;
let alertIsError = false;
let filenames = [];
let selectedFiles = [];
let lastClickedIndex = null;
let lastClickedSelect = true;
function sendMainMessage(name, data) {
    if (messagePort != null) {
        let message = { name: name, data: data };
        messagePort.postMessage(message);
    }
}
window.addEventListener("message", (event) => {
    if (event.source == window && event.data == "port") {
        messagePort = event.ports[0];
        messagePort.onmessage = (event) => {
            let message = event.data;
            handleMainMessage(message);
        };
    }
});
function handleMainMessage(message) {
    switch (message.name) {
        case "set-platform":
            platform = message.data;
            break;
        case "set-preferences":
            preferences = message.data;
            let path = "";
            if (preferences) {
                lastAddress = preferences.usb ? USB_ADDRESS : preferences.rioAddress;
                path = preferences.rioPath;
            }
            sendMainMessage("start", {
                address: lastAddress,
                path: path
            });
            break;
        case "set-focused":
            Array.from(document.getElementsByTagName("button")).forEach((button) => {
                if (message.data) {
                    button.classList.remove("blurred");
                }
                else {
                    button.classList.add("blurred");
                }
            });
            break;
        case "show-error":
            LOADING_ANIMATION.hidden = false;
            loading = true;
            startTime = null;
            ALERT_TEXT.hidden = false;
            PROGRESS_BAR.hidden = true;
            PROGRESS_DETAILS.hidden = true;
            while (FILE_LIST_ITEMS.firstChild) {
                FILE_LIST_ITEMS.removeChild(FILE_LIST_ITEMS.firstChild);
            }
            console.warn(message.data);
            let friendlyText = "";
            if (message.data == "No such file") {
                friendlyText = "Failed to open log folder at <u>" + preferences?.rioPath + "</u>";
            }
            else if (message.data == "Timed out while waiting for handshake") {
                friendlyText = "roboRIO not found at <u>" + lastAddress + "</u> (check connection)";
            }
            else if (message.data.includes("ENOTFOUND")) {
                friendlyText = "Unknown address <u>" + lastAddress + "</u>";
            }
            else if (message.data == "All configured authentication methods failed") {
                friendlyText = "Failed to authenticate to roboRIO at <u>" + lastAddress + "</u>";
            }
            else if (message.data == "Not connected") {
                friendlyText = "Lost connection to roboRIO";
            }
            else {
                friendlyText = "Unknown error: " + message.data;
            }
            alertIsError = true;
            ALERT_TEXT.innerHTML = friendlyText;
            break;
        case "show-alert":
            ALERT_TEXT.hidden = false;
            PROGRESS_BAR.hidden = true;
            PROGRESS_DETAILS.hidden = true;
            startTime = null;
            alertIsError = false;
            ALERT_TEXT.innerHTML = message.data;
            break;
        case "set-progress":
            ALERT_TEXT.hidden = true;
            PROGRESS_BAR.hidden = false;
            PROGRESS_DETAILS.hidden = false;
            alertIsError = false;
            if (message.data === 0) {
                PROGRESS_BAR.value = 0;
                PROGRESS_DETAILS.innerText = "Preparing";
            }
            else if (message.data === 1) {
                PROGRESS_BAR.value = 1;
                PROGRESS_DETAILS.innerText = "Finished";
            }
            else {
                let currentSize = message.data.current;
                let totalSize = message.data.total;
                if (startTime == null)
                    startTime = new Date().getTime() / 1000;
                let detailsText = Math.floor(currentSize / 1e6).toString() + "MB / " + Math.floor(totalSize / 1e6).toString() + "MB";
                if (new Date().getTime() / 1000 - startTime > 0.5) {
                    let speed = Math.round((currentSize / (new Date().getTime() / 1000 - startTime) / 1e6) * 8);
                    let remainingSeconds = Math.floor(((new Date().getTime() / 1000 - startTime) / currentSize) * (totalSize - currentSize));
                    let remainingMinutes = Math.floor(remainingSeconds / 60);
                    remainingSeconds -= remainingMinutes * 60;
                    detailsText +=
                        " (" +
                            speed.toString() +
                            "Mb/s, " +
                            remainingMinutes.toString() +
                            "m" +
                            zfill(remainingSeconds.toString(), 2) +
                            "s)";
                }
                PROGRESS_BAR.value = totalSize == 0 ? 0 : currentSize / totalSize;
                PROGRESS_DETAILS.innerText = detailsText;
            }
            break;
        case "set-list":
            LOADING_ANIMATION.hidden = true;
            loading = false;
            if (alertIsError) {
                ALERT_TEXT.hidden = true;
                PROGRESS_BAR.hidden = true;
                PROGRESS_DETAILS.hidden = true;
            }
            while (FILE_LIST_ITEMS.firstChild) {
                FILE_LIST_ITEMS.removeChild(FILE_LIST_ITEMS.firstChild);
            }
            let fileData = message.data;
            filenames = fileData.map((file) => file.name);
            fileData.forEach((file, index) => {
                let item = document.createElement("div");
                FILE_LIST_ITEMS.appendChild(item);
                item.classList.add("file-item");
                if (selectedFiles.includes(file.name)) {
                    item.classList.add("selected");
                }
                item.addEventListener("click", (event) => {
                    if (event.shiftKey && lastClickedIndex != null) {
                        let range = [Math.min(index, lastClickedIndex), Math.max(index, lastClickedIndex)];
                        for (let i = range[0]; i < range[1] + 1; i++) {
                            if (lastClickedSelect && !selectedFiles.includes(filenames[i])) {
                                selectedFiles.push(filenames[i]);
                                FILE_LIST_ITEMS.children[i].classList.add("selected");
                            }
                            if (!lastClickedSelect && selectedFiles.includes(filenames[i])) {
                                selectedFiles.splice(selectedFiles.indexOf(filenames[i]), 1);
                                FILE_LIST_ITEMS.children[i].classList.remove("selected");
                            }
                        }
                    }
                    else if (selectedFiles.includes(file.name)) {
                        selectedFiles.splice(selectedFiles.indexOf(file.name), 1);
                        item.classList.remove("selected");
                        lastClickedIndex = index;
                        lastClickedSelect = false;
                    }
                    else {
                        selectedFiles.push(file.name);
                        item.classList.add("selected");
                        lastClickedIndex = index;
                        lastClickedSelect = true;
                    }
                });
                let img = document.createElement("img");
                item.appendChild(img);
                let filenameComponents = file.name.split(".");
                let extension = filenameComponents[filenameComponents.length - 1];
                switch (platform) {
                    case "darwin":
                        img.src = "../icons/download/" + extension + "-icon-mac.png";
                        img.classList.add("mac");
                        break;
                    case "win32":
                        img.src = "../icons/download/" + extension + "-icon-win.png";
                        break;
                    case "linux":
                        img.src = "../icons/download/" + extension + "-icon-linux.png";
                        break;
                }
                let filenameSpan = document.createElement("span");
                item.appendChild(filenameSpan);
                filenameSpan.innerText = file.name;
                let sizeSpan = document.createElement("span");
                item.appendChild(sizeSpan);
                sizeSpan.innerText = " (" + (file.size < 1e5 ? "<0.1" : Math.round(file.size / 1e5) / 10) + " MB)";
            });
            updateFiller();
            break;
        default:
            console.warn("Unknown message from main process", message);
            break;
    }
}
function updateFiller() {
    if (loading)
        return;
    let itemCount = Array.from(FILE_LIST_ITEMS.children).filter((x) => x.childElementCount != 0).length;
    let targetFillerCount = Math.ceil((FILE_LIST.getBoundingClientRect().height - BOTTOM_FILLER_MARGIN_PX - itemCount * FILE_ITEM_HEIGHT_PX) /
        FILE_ITEM_HEIGHT_PX);
    if (targetFillerCount < 0)
        targetFillerCount = 0;
    let getCurrentFillerCount = () => {
        return Array.from(FILE_LIST_ITEMS.children).filter((x) => x.childElementCount == 0).length;
    };
    while (getCurrentFillerCount() > targetFillerCount) {
        FILE_LIST_ITEMS.removeChild(FILE_LIST_ITEMS.lastElementChild);
    }
    while (getCurrentFillerCount() < targetFillerCount) {
        let item = document.createElement("div");
        FILE_LIST_ITEMS.appendChild(item);
        item.classList.add("file-item");
    }
    FILE_LIST.style.overflow = targetFillerCount > 0 ? "hidden" : "auto";
}
function save() {
    if (selectedFiles.length == 0) {
        alert("Please select a log to download.");
    }
    else {
        sendMainMessage("save", selectedFiles);
    }
}
window.addEventListener("resize", updateFiller);
EXIT_BUTTON.addEventListener("click", () => {
    sendMainMessage("close");
});
DOWNLOAD_BUTTON.addEventListener("click", save);
window.addEventListener("keydown", (event) => {
    if (event.code == "Enter") {
        save();
    }
    else if (event.key == "a" && (platform == "darwin" ? event.metaKey : event.ctrlKey)) {
        if (filenames.length == selectedFiles.length) {
            selectedFiles = [];
            Array.from(FILE_LIST_ITEMS.children).forEach((row) => {
                row.classList.remove("selected");
            });
        }
        else {
            selectedFiles = [...filenames];
            Array.from(FILE_LIST_ITEMS.children).forEach((row) => {
                row.classList.add("selected");
            });
        }
    }
});
