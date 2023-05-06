'use strict';

var child_process = require('child_process');
var electron = require('electron');
var fs = require('fs');
var jsonfile = require('jsonfile');
var net = require('net');
var os = require('os');
var path = require('path');
var ssh2 = require('ssh2');
var fetch = require('electron-fetch');

var TabType;
(function (TabType) {
    TabType[TabType["Documentation"] = 0] = "Documentation";
    TabType[TabType["LineGraph"] = 1] = "LineGraph";
    TabType[TabType["Table"] = 2] = "Table";
    TabType[TabType["Console"] = 3] = "Console";
    TabType[TabType["Statistics"] = 4] = "Statistics";
    TabType[TabType["Odometry"] = 5] = "Odometry";
    TabType[TabType["ThreeDimension"] = 6] = "ThreeDimension";
    TabType[TabType["Video"] = 7] = "Video";
    TabType[TabType["Joysticks"] = 8] = "Joysticks";
    TabType[TabType["Swerve"] = 9] = "Swerve";
    TabType[TabType["Mechanism"] = 10] = "Mechanism";
    TabType[TabType["Points"] = 11] = "Points";
    TabType[TabType["Metadata"] = 12] = "Metadata";
    TabType[TabType["MotorChecker"] = 13] = "MotorChecker";
})(TabType || (TabType = {}));
[
    TabType.Odometry,
    TabType.ThreeDimension,
    TabType.Video,
    TabType.Points,
    TabType.Joysticks,
    TabType.Swerve,
    TabType.Mechanism
];
function getAllTabTypes() {
    return Object.values(TabType).filter((tabType) => typeof tabType == "number");
}
function getDefaultTabTitle(type) {
    switch (type) {
        case TabType.Documentation:
            return "";
        case TabType.LineGraph:
            return "Line Graph";
        case TabType.Table:
            return "Table";
        case TabType.Console:
            return "Console";
        case TabType.Statistics:
            return "Statistics";
        case TabType.Odometry:
            return "Odometry";
        case TabType.ThreeDimension:
            return "3D Field";
        case TabType.Video:
            return "Video";
        case TabType.Joysticks:
            return "Joysticks";
        case TabType.Swerve:
            return "Swerve";
        case TabType.Mechanism:
            return "Mechanism";
        case TabType.Points:
            return "Points";
        case TabType.Metadata:
            return "Metadata";
        case TabType.MotorChecker:
            return "MotorChecker";
        default:
            return "";
    }
}
function getTabIcon(type) {
    switch (type) {
        case TabType.Documentation:
            return "📖";
        case TabType.LineGraph:
            return "📉";
        case TabType.Table:
            return "🔢";
        case TabType.Console:
            return "💬";
        case TabType.Statistics:
            return "📊";
        case TabType.Odometry:
            return "🗺";
        case TabType.ThreeDimension:
            return "👀";
        case TabType.Video:
            return "🎬";
        case TabType.Joysticks:
            return "🎮";
        case TabType.Swerve:
            return "🦀";
        case TabType.Mechanism:
            return "🦾";
        case TabType.Points:
            return "🔵";
        case TabType.Metadata:
            return "🔍";
        case TabType.MotorChecker:
            return "🏍️";
        default:
            return "";
    }
}

function checkArrayType(value, type) {
    if (!Array.isArray(value))
        return false;
    value.forEach((item) => {
        if (typeof item !== type)
            return false;
    });
    return true;
}
function jsonCopy(value) {
    return JSON.parse(JSON.stringify(value));
}
function createUUID() {
    let outString = "";
    let inOptions = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
    }
    return outString;
}

const REPOSITORY = "Mechanical-Advantage/AdvantageScope";
const PREFS_FILENAME = path.join(electron.app.getPath("userData"), "prefs.json");
const STATE_FILENAME = path.join(electron.app.getPath("userData"), "state-" + electron.app.getVersion().replaceAll(".", "_") + ".json");
const EXTRA_FRC_DATA = path.join(electron.app.getPath("userData"), "frcData");
const LAST_OPEN_FILE = path.join(electron.app.getPath("temp"), "akit-log-path.txt");
const VIDEO_CACHE = path.join(electron.app.getPath("temp"), "advantagescope-videos");
const WINDOW_ICON = (() => {
    switch (process.platform) {
        case "win32":
            return path.join(__dirname, "../icons/window/window-icon-win.png");
        case "linux":
            return path.join(__dirname, "../icons/window/window-icon-linux.png");
        default:
            return undefined;
    }
})();
const DEFAULT_PREFS = {
    theme: process.platform == "linux" ? "light" : "system",
    rioAddress: "10.63.28.2",
    rioPath: "/media/sda1/",
    liveMode: "nt4",
    liveSubscribeMode: "low-bandwidth",
    rlogPort: 5800,
    threeDimensionMode: "quality"
};
const RLOG_CONNECT_TIMEOUT_MS = 3000;
const RLOG_DATA_TIMEOUT_MS = 3000;
const RLOG_HEARTBEAT_DELAY_MS = 500;
const RLOG_HEARTBEAT_DATA = new Uint8Array([6, 3, 2, 8]);
const DOWNLOAD_USERNAME = "lvuser";
const DOWNLOAD_PASSWORD = "";
const DOWNLOAD_CONNECT_TIMEOUT_MS = 3000;
const DOWNLOAD_RETRY_DELAY_MS = 1000;
const DOWNLOAD_REFRESH_INTERVAL_MS = 5000;

function createExtraFRCDataFolder() {
    if (!fs.existsSync(EXTRA_FRC_DATA)) {
        fs.mkdirSync(EXTRA_FRC_DATA);
    }
    fs.copyFileSync(path.join(__dirname, "..", "frcData", "extra-readme.txt"), path.join(EXTRA_FRC_DATA, "README.txt"));
}
function loadFRCData() {
    let frcData = {
        field2ds: [],
        field3ds: [],
        robots: [],
        joysticks: []
    };
    [path.join(__dirname, "..", "frcData"), EXTRA_FRC_DATA].forEach((folder) => {
        fs.readdirSync(folder).forEach((file) => {
            if (!file.endsWith(".json"))
                return;
            let title = file.split("_").slice(1).join("_").split(".").slice(0, -1).join(".");
            let configRaw = jsonfile.readFileSync(path.join(folder, file));
            let isField2d = file.startsWith("Field2d_");
            let isField3d = file.startsWith("Field3d_");
            let isRobot = file.startsWith("Robot_");
            let isJoystick = file.startsWith("Joystick_");
            if (isField2d) {
                let config = {
                    title: title,
                    path: path.join(folder, "Field2d_" + title + ".png"),
                    topLeft: [0, 0],
                    bottomRight: [0, 0],
                    widthInches: 0,
                    heightInches: 0
                };
                if (typeof configRaw == "object") {
                    if ("sourceUrl" in configRaw && typeof configRaw.sourceUrl === "string") {
                        config.sourceUrl = configRaw.sourceUrl;
                    }
                    if ("topLeft" in configRaw && checkArrayType(configRaw.topLeft, "number") && configRaw.topLeft.length == 2) {
                        config.topLeft = configRaw.topLeft;
                    }
                    if ("bottomRight" in configRaw &&
                        checkArrayType(configRaw.bottomRight, "number") &&
                        configRaw.topLeft.length == 2) {
                        config.bottomRight = configRaw.bottomRight;
                    }
                    if ("widthInches" in configRaw && typeof configRaw.widthInches === "number") {
                        config.widthInches = configRaw.widthInches;
                    }
                    if ("heightInches" in configRaw && typeof configRaw.heightInches === "number") {
                        config.heightInches = configRaw.heightInches;
                    }
                }
                frcData.field2ds.push(config);
            }
            else if (isField3d) {
                let config = {
                    title: title,
                    path: path.join(folder, "Field3d_" + title + ".glb"),
                    rotations: [],
                    widthInches: 0,
                    heightInches: 0
                };
                if (typeof configRaw == "object") {
                    if ("sourceUrl" in configRaw && typeof configRaw.sourceUrl === "string") {
                        config.sourceUrl = configRaw.sourceUrl;
                    }
                    if ("rotations" in configRaw &&
                        Array.isArray(configRaw.rotations) &&
                        configRaw.rotations.every((rotation) => typeof rotation === "object" &&
                            "axis" in rotation &&
                            (rotation.axis === "x" || rotation.axis === "y" || rotation.axis === "z") &&
                            "degrees" in rotation &&
                            typeof rotation.degrees === "number")) {
                        config.rotations = configRaw.rotations;
                    }
                    if ("widthInches" in configRaw && typeof configRaw.widthInches === "number") {
                        config.widthInches = configRaw.widthInches;
                    }
                    if ("heightInches" in configRaw && typeof configRaw.heightInches === "number") {
                        config.heightInches = configRaw.heightInches;
                    }
                }
                frcData.field3ds.push(config);
            }
            else if (isRobot) {
                let config = {
                    title: title,
                    path: path.join(folder, "Robot_" + title + ".glb"),
                    rotations: [],
                    position: [0, 0, 0],
                    cameras: [],
                    components: []
                };
                if (typeof configRaw == "object") {
                    if ("sourceUrl" in configRaw && typeof configRaw.sourceUrl === "string") {
                        config.sourceUrl = configRaw.sourceUrl;
                    }
                    if ("rotations" in configRaw &&
                        Array.isArray(configRaw.rotations) &&
                        configRaw.rotations.every((rotation) => typeof rotation === "object" &&
                            "axis" in rotation &&
                            (rotation.axis === "x" || rotation.axis === "y" || rotation.axis === "z") &&
                            "degrees" in rotation &&
                            typeof rotation.degrees === "number")) {
                        config.rotations = configRaw.rotations;
                    }
                    if ("position" in configRaw &&
                        checkArrayType(configRaw.position, "number") &&
                        configRaw.position.length == 3) {
                        config.position = configRaw.position;
                    }
                    if ("cameras" in configRaw && Array.isArray(configRaw.cameras)) {
                        configRaw.cameras.forEach((cameraRaw) => {
                            let camera = {
                                name: "",
                                rotations: [],
                                position: [0, 0, 0],
                                resolution: [200, 100],
                                fov: 90
                            };
                            config.cameras.push(camera);
                            if ("name" in cameraRaw && typeof cameraRaw.name === "string") {
                                camera.name = cameraRaw.name;
                            }
                            if ("rotations" in cameraRaw &&
                                Array.isArray(cameraRaw.rotations) &&
                                cameraRaw.rotations.every((rotation) => typeof rotation === "object" &&
                                    "axis" in rotation &&
                                    (rotation.axis === "x" || rotation.axis === "y" || rotation.axis === "z") &&
                                    "degrees" in rotation &&
                                    typeof rotation.degrees === "number")) {
                                camera.rotations = cameraRaw.rotations;
                            }
                            if ("position" in cameraRaw &&
                                checkArrayType(cameraRaw.position, "number") &&
                                cameraRaw.position.length == 3) {
                                camera.position = cameraRaw.position;
                            }
                            if ("resolution" in cameraRaw &&
                                checkArrayType(cameraRaw.resolution, "number") &&
                                cameraRaw.resolution.length == 2) {
                                camera.resolution = cameraRaw.resolution;
                            }
                            if ("fov" in cameraRaw && typeof cameraRaw.fov === "number") {
                                camera.fov = cameraRaw.fov;
                            }
                        });
                    }
                    if ("components" in configRaw && Array.isArray(configRaw.components)) {
                        configRaw.components.forEach((componentRaw) => {
                            let component = {
                                zeroedRotations: [],
                                zeroedPosition: [0, 0, 0]
                            };
                            config.components.push(component);
                            if ("zeroedRotations" in componentRaw &&
                                Array.isArray(componentRaw.zeroedRotations) &&
                                componentRaw.zeroedRotations.every((rotation) => typeof rotation === "object" &&
                                    "axis" in rotation &&
                                    (rotation.axis === "x" || rotation.axis === "y" || rotation.axis === "z") &&
                                    "degrees" in rotation &&
                                    typeof rotation.degrees === "number")) {
                                component.zeroedRotations = componentRaw.zeroedRotations;
                            }
                            if ("zeroedPosition" in componentRaw &&
                                checkArrayType(componentRaw.zeroedPosition, "number") &&
                                componentRaw.zeroedPosition.length == 3) {
                                component.zeroedPosition = componentRaw.zeroedPosition;
                            }
                        });
                    }
                }
                frcData.robots.push(config);
            }
            else if (isJoystick) {
                let config = {
                    title: title,
                    path: path.join(folder, "Joystick_" + title + ".png"),
                    components: []
                };
                if (Array.isArray(configRaw)) {
                    configRaw.forEach((componentRaw) => {
                        let isYellow = false;
                        if ("isYellow" in componentRaw && typeof componentRaw.isYellow === "boolean") {
                            isYellow = componentRaw.isYellow;
                        }
                        let centerPx = [0, 0];
                        if ("centerPx" in componentRaw &&
                            Array.isArray(componentRaw.centerPx) &&
                            checkArrayType(componentRaw.centerPx, "number") &&
                            componentRaw.centerPx.length == 2) {
                            centerPx = componentRaw.centerPx;
                        }
                        if ("type" in componentRaw && typeof componentRaw.type === "string") {
                            switch (componentRaw.type) {
                                case "button":
                                    let buttonComponent = {
                                        type: "button",
                                        isYellow: isYellow,
                                        isEllipse: false,
                                        centerPx: centerPx,
                                        sizePx: [0, 0],
                                        sourceIndex: 0
                                    };
                                    if ("isEllipse" in componentRaw && typeof componentRaw.isEllipse === "boolean") {
                                        buttonComponent.isEllipse = componentRaw.isEllipse;
                                    }
                                    if ("sizePx" in componentRaw &&
                                        Array.isArray(componentRaw.sizePx) &&
                                        checkArrayType(componentRaw.sizePx, "number") &&
                                        componentRaw.sizePx.length == 2) {
                                        buttonComponent.sizePx = componentRaw.sizePx;
                                    }
                                    if ("sourceIndex" in componentRaw && typeof componentRaw.sourceIndex === "number") {
                                        buttonComponent.sourceIndex = componentRaw.sourceIndex;
                                    }
                                    if ("sourcePov" in componentRaw &&
                                        typeof componentRaw.sourcePov === "string" &&
                                        (componentRaw.sourcePov == "up" ||
                                            componentRaw.sourcePov == "right" ||
                                            componentRaw.sourcePov == "down" ||
                                            componentRaw.sourcePov == "left")) {
                                        buttonComponent.sourcePov = componentRaw.sourcePov;
                                    }
                                    config.components.push(buttonComponent);
                                    break;
                                case "joystick":
                                    let joystickComponent = {
                                        type: "joystick",
                                        isYellow: isYellow,
                                        centerPx: centerPx,
                                        radiusPx: 0,
                                        xSourceIndex: 0,
                                        xSourceInverted: false,
                                        ySourceIndex: 0,
                                        ySourceInverted: false
                                    };
                                    if ("radiusPx" in componentRaw && typeof componentRaw.radiusPx === "number") {
                                        joystickComponent.radiusPx = componentRaw.radiusPx;
                                    }
                                    if ("xSourceIndex" in componentRaw && typeof componentRaw.xSourceIndex === "number") {
                                        joystickComponent.xSourceIndex = componentRaw.xSourceIndex;
                                    }
                                    if ("xSourceInverted" in componentRaw && typeof componentRaw.xSourceInverted === "boolean") {
                                        joystickComponent.xSourceInverted = componentRaw.xSourceInverted;
                                    }
                                    if ("ySourceIndex" in componentRaw && typeof componentRaw.ySourceIndex === "number") {
                                        joystickComponent.ySourceIndex = componentRaw.ySourceIndex;
                                    }
                                    if ("ySourceInverted" in componentRaw && typeof componentRaw.ySourceInverted === "boolean") {
                                        joystickComponent.ySourceInverted = componentRaw.ySourceInverted;
                                    }
                                    if ("buttonSourceIndex" in componentRaw && typeof componentRaw.buttonSourceIndex === "number") {
                                        joystickComponent.buttonSourceIndex = componentRaw.buttonSourceIndex;
                                    }
                                    config.components.push(joystickComponent);
                                    break;
                                case "axis":
                                    let axisComponent = {
                                        type: "axis",
                                        isYellow: isYellow,
                                        centerPx: centerPx,
                                        sizePx: [0, 0],
                                        sourceIndex: 0,
                                        sourceRange: [-1, 1]
                                    };
                                    if ("sizePx" in componentRaw &&
                                        Array.isArray(componentRaw.sizePx) &&
                                        checkArrayType(componentRaw.sizePx, "number") &&
                                        componentRaw.sizePx.length == 2) {
                                        axisComponent.sizePx = componentRaw.sizePx;
                                    }
                                    if ("sourceIndex" in componentRaw && typeof componentRaw.sourceIndex === "number") {
                                        axisComponent.sourceIndex = componentRaw.sourceIndex;
                                    }
                                    if ("sourceRange" in componentRaw &&
                                        Array.isArray(componentRaw.sourceRange) &&
                                        checkArrayType(componentRaw.sourceRange, "number") &&
                                        componentRaw.sourceRange.length == 2) {
                                        axisComponent.sourceRange = componentRaw.sourceRange;
                                    }
                                    config.components.push(axisComponent);
                                    break;
                            }
                        }
                    });
                }
                frcData.joysticks.push(config);
            }
        });
    });
    frcData.field2ds.sort((a, b) => (a.title > b.title ? -1 : b.title > a.title ? 1 : 0));
    frcData.field3ds.sort((a, b) => {
        if (a.title == "Evergreen")
            return 1;
        if (b.title == "Evergreen")
            return -1;
        return a.title > b.title ? -1 : b.title > a.title ? 1 : 0;
    });
    frcData.robots.sort((a, b) => {
        if (a.title == "KitBot")
            return -1;
        if (b.title == "KitBot")
            return 1;
        return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
    frcData.joysticks.sort((a, b) => (a.title > b.title ? -1 : b.title > a.title ? 1 : 0));
    return frcData;
}

class StateTracker {
    SAVE_PERIOD_MS = 250;
    focusedWindow = null;
    rendererStateCache = {};
    constructor() {
        setInterval(() => {
            if (this.focusedWindow == null)
                return;
            if (this.focusedWindow.isDestroyed())
                return;
            let bounds = this.focusedWindow.getBounds();
            let state = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                rendererState: this.rendererStateCache[this.focusedWindow.id]
            };
            jsonfile.writeFileSync(STATE_FILENAME, state);
        }, this.SAVE_PERIOD_MS);
    }
    getState(defaultWidth, defaultHeight) {
        let state = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        let resetToDefault;
        if (fs.existsSync(STATE_FILENAME)) {
            try {
                state = jsonfile.readFileSync(STATE_FILENAME);
                resetToDefault = !electron.screen.getAllDisplays().some((display) => {
                    return (state.x >= display.bounds.x &&
                        state.y >= display.bounds.y &&
                        state.x + state.width <= display.bounds.x + display.bounds.width &&
                        state.y + state.height <= display.bounds.y + display.bounds.height);
                });
            }
            catch (e) {
                console.error("Unable to load state. Reverting to default settings.", e);
                fs.copyFileSync(STATE_FILENAME, STATE_FILENAME.slice(0, -5) + "-corrupted.json");
                resetToDefault = true;
            }
        }
        else {
            resetToDefault = true;
        }
        if (resetToDefault) {
            const bounds = electron.screen.getPrimaryDisplay().bounds;
            state = {
                x: bounds.x + bounds.width / 2 - defaultWidth / 2,
                y: bounds.y + bounds.height / 2 - defaultHeight / 2,
                width: defaultWidth,
                height: defaultHeight
            };
        }
        return state;
    }
    setFocusedWindow(window) {
        this.focusedWindow = window;
    }
    saveRendererState(window, rendererState) {
        this.rendererStateCache[window.id] = rendererState;
    }
    getRendererState(window) {
        return this.rendererStateCache[window.id];
    }
}

class UpdateChecker {
    shouldPrompt = false;
    alertMessage = "Update check not complete";
    alertDetail = "Checking for update information. Please try again.";
    alertOptions = null;
    alertCancelId = null;
    alertDownloadUrl = null;
    async check() {
        if (!electron.app.isPackaged) {
            this.shouldPrompt = false;
            this.alertOptions = null;
            this.alertCancelId = null;
            this.alertDownloadUrl = null;
            this.alertMessage = "Cannot check for updates";
            this.alertDetail = "This app is running in a development environment.";
            return;
        }
        let releaseData;
        try {
            let response = await fetch.default("https://api.github.com/repos/" + REPOSITORY + "/releases", {
                method: "GET",
                headers: {
                    pragma: "no-cache",
                    "cache-control": "no-cache"
                }
            });
            releaseData = await response.json();
        }
        catch (error) {
            console.error(error);
            this.shouldPrompt = false;
            this.alertOptions = null;
            this.alertCancelId = null;
            this.alertDownloadUrl = null;
            this.alertMessage = "Cannot check for updates";
            this.alertDetail =
                "Failed to retrieve update information from GitHub. Please check your internet connection and try again.";
            return;
        }
        let currentVersion = electron.app.getVersion();
        let latestVersionInfo = releaseData[0];
        let latestVersion = latestVersionInfo["tag_name"].slice(1);
        let latestDate = new Date(latestVersionInfo["published_at"]);
        let latestDateText = latestDate.toLocaleDateString();
        let translated = process.arch != "arm64" && electron.app.runningUnderARM64Translation;
        this.shouldPrompt = true;
        this.alertOptions =
            process.platform == "darwin" ? ["Download", "Later", "View Changelog"] : ["Download", "View Changelog", "Later"];
        this.alertCancelId = process.platform == "darwin" ? 1 : 2;
        this.alertDownloadUrl = null;
        if (currentVersion != latestVersion && translated) {
            this.alertMessage = "Download latest native version?";
            this.alertDetail =
                "Version " +
                    latestVersion +
                    " is available (released " +
                    latestDateText +
                    "). You're currently running the x86 build of version " +
                    currentVersion +
                    " on an arm64 platform. Would you like to download the latest native version?";
        }
        else if (currentVersion != latestVersion) {
            this.alertMessage = "Download latest version?";
            this.alertDetail =
                "Version " +
                    latestVersion +
                    " is available (released " +
                    latestDateText +
                    "). You're currently running version " +
                    currentVersion +
                    ". Would you like to download the latest version?";
        }
        else if (translated) {
            this.alertMessage = "Download native version?";
            this.alertDetail =
                "It looks like you're running the x86 version of this app on an arm64 platform. Would you like to download the native version?";
        }
        else {
            this.shouldPrompt = false;
            this.alertOptions = null;
            this.alertCancelId = null;
            this.alertMessage = "No updates available";
            this.alertDetail = "You're currently running version " + currentVersion + " (released " + latestDateText + ").";
            return;
        }
        let platformKey = "";
        switch (process.platform) {
            case "win32":
                platformKey = "win";
                break;
            case "linux":
                platformKey = "linux";
                break;
            case "darwin":
                platformKey = "mac";
                break;
        }
        let arch = translated ? "arm64" : process.arch;
        latestVersionInfo["assets"].forEach((asset) => {
            if (asset.name.includes(platformKey) && asset.name.includes(arch)) {
                this.alertDownloadUrl = asset.browser_download_url;
            }
        });
    }
    getShouldPrompt() {
        return this.shouldPrompt;
    }
    async showPrompt() {
        if (this.alertOptions === null || this.alertCancelId === null) {
            await electron.dialog.showMessageBox({
                type: "info",
                title: "Update Checker",
                message: this.alertMessage,
                detail: this.alertDetail,
                icon: WINDOW_ICON
            });
            return;
        }
        let result = await electron.dialog.showMessageBox({
            type: "question",
            title: "Update Checker",
            message: this.alertMessage,
            detail: this.alertDetail,
            icon: WINDOW_ICON,
            buttons: this.alertOptions,
            defaultId: 0,
            cancelId: this.alertCancelId
        });
        let responseString = this.alertOptions[result.response];
        if (responseString == "Download") {
            if (this.alertDownloadUrl === null) {
                await electron.shell.openExternal("https://github.com/" + REPOSITORY + "/releases/latest");
            }
            else {
                await electron.shell.openExternal(this.alertDownloadUrl);
            }
        }
        else if (responseString == "View Changelog") {
            await electron.shell.openExternal("https://github.com/" + REPOSITORY + "/releases");
        }
    }
}

const videoExtensions = [
    "3g2",
    "3gp",
    "aaf",
    "asf",
    "avchd",
    "avi",
    "drc",
    "flv",
    "m2v",
    "m3u8",
    "m4p",
    "m4v",
    "mkv",
    "mng",
    "mov",
    "mp2",
    "mp4",
    "mpe",
    "mpeg",
    "mpg",
    "mpv",
    "mxf",
    "nsv",
    "ogg",
    "ogv",
    "qt",
    "rm",
    "rmvb",
    "roq",
    "svi",
    "vob",
    "webm",
    "wmv",
    "yuv"
];

let hubWindows = [];
let downloadWindow = null;
let prefsWindow = null;
let satelliteWindows = {};
let windowPorts = {};
let hubStateTracker = new StateTracker();
let updateChecker = new UpdateChecker();
let usingUsb = false;
let firstOpenPath = null;
let videoProcesses = {};
let videoFolderUUIDs = [];
let frcData = {
    field2ds: [],
    field3ds: [],
    robots: [],
    joysticks: []
};
let rlogSockets = {};
let rlogSocketTimeouts = {};
let rlogDataArrays = {};
let downloadClient = null;
let downloadRetryTimeout = null;
let downloadRefreshInterval = null;
let downloadAddress = "";
let downloadPath = "";
let downloadFileSizeCache = {};
function sendMessage(window, name, data) {
    try {
        windowPorts[window.id].postMessage({ name: name, data: data });
    }
    catch (e) {
        return false;
    }
    return true;
}
function sendAllPreferences() {
    let data = jsonfile.readFileSync(PREFS_FILENAME);
    data.usb = usingUsb;
    electron.nativeTheme.themeSource = data.theme;
    hubWindows.forEach((window) => {
        if (!window.isDestroyed()) {
            sendMessage(window, "set-preferences", data);
        }
    });
    Object.values(satelliteWindows).forEach((satelliteArray) => {
        satelliteArray.forEach((satellite) => {
            if (!satellite.isDestroyed()) {
                sendMessage(satellite, "set-preferences", data);
            }
        });
    });
    if (downloadWindow != null && !downloadWindow.isDestroyed())
        sendMessage(downloadWindow, "set-preferences", data);
}
function handleHubMessage(window, message) {
    if (window.isDestroyed())
        return;
    let windowId = window.id;
    switch (message.name) {
        case "alert":
            electron.dialog.showMessageBox(window, {
                type: "info",
                title: "Alert",
                message: message.data.title,
                detail: message.data.content,
                icon: WINDOW_ICON
            });
            break;
        case "error":
            electron.dialog.showMessageBox(window, {
                type: "error",
                title: "Error",
                message: message.data.title,
                detail: message.data.content,
                icon: WINDOW_ICON
            });
            break;
        case "save-state":
            hubStateTracker.saveRendererState(window, message.data);
            break;
        case "prompt-update":
            updateChecker.showPrompt();
            break;
        case "historical-start":
            let paths = message.data;
            paths.forEach((path) => electron.app.addRecentDocument(path));
            fs.writeFile(LAST_OPEN_FILE, paths[0], () => { });
            let completedCount = 0;
            let results = paths.map(() => null);
            paths.forEach((path, index) => {
                fs.open(path, "r", (error, file) => {
                    if (error) {
                        completedCount++;
                        if (completedCount == paths.length) {
                            sendMessage(window, "historical-data", results);
                        }
                        return;
                    }
                    fs.readFile(file, (error, buffer) => {
                        completedCount++;
                        if (!error) {
                            results[index] = buffer;
                        }
                        if (completedCount == paths.length) {
                            sendMessage(window, "historical-data", results);
                        }
                    });
                });
            });
            break;
        case "live-rlog-start":
            rlogSockets[windowId]?.destroy();
            rlogSockets[windowId] = net.createConnection({
                host: message.data.address,
                port: message.data.port
            });
            rlogSockets[windowId].setTimeout(RLOG_CONNECT_TIMEOUT_MS, () => {
                sendMessage(window, "live-rlog-data", { uuid: message.data.uuid, status: false });
            });
            let appendArray = (newArray) => {
                let fullArray = new Uint8Array(rlogDataArrays[windowId].length + newArray.length);
                fullArray.set(rlogDataArrays[windowId]);
                fullArray.set(newArray, rlogDataArrays[windowId].length);
                rlogDataArrays[windowId] = fullArray;
            };
            rlogDataArrays[windowId] = new Uint8Array();
            rlogSockets[windowId].on("data", (data) => {
                appendArray(data);
                if (rlogSocketTimeouts[windowId] != null)
                    clearTimeout(rlogSocketTimeouts[windowId]);
                rlogSocketTimeouts[windowId] = setTimeout(() => {
                    rlogSockets[windowId]?.destroy();
                }, RLOG_DATA_TIMEOUT_MS);
                while (true) {
                    let expectedLength;
                    if (rlogDataArrays[windowId].length < 4) {
                        break;
                    }
                    else {
                        expectedLength = new DataView(rlogDataArrays[windowId].buffer).getInt32(0) + 4;
                        if (rlogDataArrays[windowId].length < expectedLength) {
                            break;
                        }
                    }
                    let singleArray = rlogDataArrays[windowId].slice(4, expectedLength);
                    rlogDataArrays[windowId] = rlogDataArrays[windowId].slice(expectedLength);
                    let success = sendMessage(window, "live-rlog-data", {
                        uuid: message.data.uuid,
                        success: true,
                        raw: new Uint8Array(singleArray)
                    });
                    if (!success) {
                        rlogSockets[windowId]?.destroy();
                    }
                }
            });
            rlogSockets[windowId].on("error", () => {
                sendMessage(window, "live-rlog-data", { uuid: message.data.uuid, success: false });
            });
            rlogSockets[windowId].on("close", () => {
                sendMessage(window, "live-rlog-data", { uuid: message.data.uuid, success: false });
            });
            break;
        case "live-rlog-stop":
            rlogSockets[windowId]?.destroy();
            break;
        case "open-link":
            electron.shell.openExternal(message.data);
            break;
        case "ask-playback-speed":
            const playbackSpeedMenu = new electron.Menu();
            Array(0.25, 0.5, 1, 1.5, 2, 4, 8).forEach((value) => {
                playbackSpeedMenu.append(new electron.MenuItem({
                    label: (value * 100).toString() + "%",
                    type: "checkbox",
                    checked: value == message.data.speed,
                    click() {
                        sendMessage(window, "set-playback-speed", value);
                    }
                }));
            });
            playbackSpeedMenu.popup({
                window: window,
                x: message.data.x,
                y: message.data.y
            });
            break;
        case "ask-new-tab":
            newTabPopup(window);
            break;
        case "ask-edit-axis":
            let legend = message.data.legend;
            const editAxisMenu = new electron.Menu();
            if (legend != "discrete") {
                let lockedRange = message.data.lockedRange;
                let unitConversion = message.data.unitConversion;
                editAxisMenu.append(new electron.MenuItem({
                    label: "Lock Axis",
                    type: "checkbox",
                    checked: lockedRange != null,
                    click() {
                        sendMessage(window, "edit-axis", {
                            legend: legend,
                            lockedRange: lockedRange == null ? [null, null] : null,
                            unitConversion: unitConversion
                        });
                    }
                }));
                editAxisMenu.append(new electron.MenuItem({
                    label: "Edit Range...",
                    enabled: lockedRange != null,
                    click() {
                        createEditRangeWindow(window, lockedRange, (newLockedRange) => {
                            sendMessage(window, "edit-axis", {
                                legend: legend,
                                lockedRange: newLockedRange,
                                unitConversion: unitConversion
                            });
                        });
                    }
                }));
                editAxisMenu.append(new electron.MenuItem({
                    type: "separator"
                }));
                editAxisMenu.append(new electron.MenuItem({
                    label: "Unit Conversion...",
                    click() {
                        createUnitConversionWindow(window, unitConversion, (newUnitConversion) => {
                            sendMessage(window, "edit-axis", {
                                legend: legend,
                                lockedRange: lockedRange,
                                unitConversion: newUnitConversion
                            });
                        });
                    }
                }));
            }
            editAxisMenu.append(new electron.MenuItem({
                label: "Clear All",
                click() {
                    sendMessage(window, "clear-axis", legend);
                }
            }));
            editAxisMenu.popup({
                window: window,
                x: message.data.x,
                y: message.data.y
            });
            break;
        case "ask-rename-tab":
            const renameTabMenu = new electron.Menu();
            renameTabMenu.append(new electron.MenuItem({
                label: "Rename...",
                click() {
                    createRenameTabWindow(window, message.data.name, (newName) => {
                        sendMessage(window, "rename-tab", {
                            index: message.data.index,
                            name: newName
                        });
                    });
                }
            }));
            renameTabMenu.popup({
                window: window
            });
            break;
        case "create-satellite":
            createSatellite(window, message.data.uuid, message.data.type);
            break;
        case "update-satellite":
            let uuid = message.data.uuid;
            let command = message.data.command;
            let title = message.data.title;
            if (uuid in satelliteWindows) {
                satelliteWindows[uuid].forEach((satellite) => {
                    if (satellite.isVisible()) {
                        sendMessage(satellite, "render", { command: command, title: title });
                    }
                });
            }
            break;
        case "ask-3d-camera":
            select3DCameraPopup(window, message.data.options, message.data.selectedIndex);
            break;
        case "prompt-export":
            if (message.data.incompleteWarning) {
                electron.dialog
                    .showMessageBox(window, {
                    type: "info",
                    title: "Warning",
                    message: "Incomplete data for export",
                    detail: 'Some fields will not be available in the exported data. To save all fields from the server, the "Logging" live mode must be selected. Check the AdvantageScope documentation for details.',
                    buttons: ["Continue", "Cancel"],
                    icon: WINDOW_ICON
                })
                    .then((value) => {
                    if (value.response == 0) {
                        createExportWindow(window, message.data.path);
                    }
                });
            }
            else {
                createExportWindow(window, message.data.path);
            }
            break;
        case "write-export":
            fs.writeFile(message.data.path, message.data.content, (err) => {
                if (err)
                    throw err;
                else {
                    sendMessage(window, "finish-export");
                }
            });
            break;
        case "select-video":
            electron.dialog
                .showOpenDialog(window, {
                title: "Select a video to open",
                properties: ["openFile"],
                filters: [{ name: "Videos", extensions: videoExtensions }]
            })
                .then((result) => {
                if (result.filePaths.length > 0) {
                    let videoPath = result.filePaths[0];
                    let uuid = message.data;
                    sendMessage(window, "video-data", {
                        uuid: uuid,
                        path: videoPath
                    });
                    let folderUUID = createUUID();
                    videoFolderUUIDs.push(folderUUID);
                    let cachePath = path.join(VIDEO_CACHE, folderUUID) + path.sep;
                    if (fs.existsSync(cachePath)) {
                        fs.rmSync(cachePath, { recursive: true });
                    }
                    fs.mkdirSync(cachePath, { recursive: true });
                    let platformString = "";
                    switch (process.platform) {
                        case "darwin":
                            platformString = "mac";
                            break;
                        case "linux":
                            platformString = "linux";
                            break;
                        case "win32":
                            platformString = "win";
                            break;
                    }
                    let ffmpegPath;
                    if (electron.app.isPackaged) {
                        ffmpegPath = path.join(__dirname, "..", "..", "ffmpeg-" + platformString + "-" + process.arch);
                    }
                    else {
                        ffmpegPath = path.join(__dirname, "..", "ffmpeg", "ffmpeg-" + platformString + "-" + process.arch);
                    }
                    if (uuid in videoProcesses)
                        videoProcesses[uuid].kill();
                    let ffmpeg = child_process.spawn(ffmpegPath, ["-i", videoPath, "-q:v", "2", path.join(cachePath, "%08d.jpg")]);
                    videoProcesses[uuid] = ffmpeg;
                    let running = true;
                    let fullOutput = "";
                    let fps = 0;
                    let durationSecs = 0;
                    let completedFrames = 0;
                    let sendError = () => {
                        running = false;
                        ffmpeg.kill();
                        electron.dialog.showMessageBox(window, {
                            type: "error",
                            title: "Error",
                            message: "Failed to open video",
                            detail: "There was a problem while reading the video file. Please try again.",
                            icon: WINDOW_ICON
                        });
                        console.log("*** START FFMPEG OUTPUT ***");
                        console.log(fullOutput);
                        console.log("*** END FFMPEG OUTPUT ***");
                    };
                    ffmpeg.stderr.on("data", (data) => {
                        if (!running)
                            return;
                        let text = data.toString();
                        fullOutput += text;
                        if (text.includes(" fps, ")) {
                            let fpsIndex = text.lastIndexOf(" fps, ");
                            let fpsStartIndex = text.lastIndexOf(" ", fpsIndex - 1);
                            fps = Number(text.slice(fpsStartIndex + 1, fpsIndex));
                            if (isNaN(fps)) {
                                sendError();
                                return;
                            }
                        }
                        if (text.includes("Duration: ")) {
                            let durationIndex = text.lastIndexOf("Duration: ");
                            let durationText = text.slice(durationIndex + 10, durationIndex + 21);
                            durationSecs =
                                Number(durationText.slice(0, 2)) * 3600 +
                                    Number(durationText.slice(3, 5)) * 60 +
                                    Number(durationText.slice(6, 8)) +
                                    Number(durationText.slice(9, 11)) * 0.01;
                            if (isNaN(durationSecs)) {
                                sendError();
                                return;
                            }
                        }
                        if (text.startsWith("frame=")) {
                            if (fps == 0 || durationSecs == 0) {
                                sendError();
                                return;
                            }
                            let fpsIndex = text.indexOf(" fps=");
                            completedFrames = Number(text.slice(6, fpsIndex));
                            if (isNaN(completedFrames)) {
                                sendError();
                                return;
                            }
                            sendMessage(window, "video-data", {
                                uuid: uuid,
                                imgFolder: cachePath,
                                fps: fps,
                                totalFrames: Math.round(durationSecs * fps),
                                completedFrames: completedFrames
                            });
                        }
                    });
                    ffmpeg.on("close", (code) => {
                        if (!running)
                            return;
                        if (code == 0) {
                            sendMessage(window, "video-data", {
                                uuid: uuid,
                                imgFolder: cachePath,
                                fps: fps,
                                totalFrames: completedFrames,
                                completedFrames: completedFrames
                            });
                        }
                        else if (code == 1) {
                            sendError();
                        }
                    });
                }
            });
            break;
        default:
            console.warn("Unknown message from hub renderer process", message);
            break;
    }
}
setInterval(() => {
    Object.values(rlogSockets).forEach((socket) => {
        socket.write(RLOG_HEARTBEAT_DATA);
    });
}, RLOG_HEARTBEAT_DELAY_MS);
function newTabPopup(window) {
    if (!hubWindows.includes(window))
        return;
    const newTabMenu = new electron.Menu();
    getAllTabTypes()
        .slice(1)
        .forEach((tabType, index) => {
        newTabMenu.append(new electron.MenuItem({
            label: getTabIcon(tabType) + " " + getDefaultTabTitle(tabType),
            accelerator: index < 9 ? "CmdOrCtrl+" + (index + 1).toString() : "",
            click() {
                sendMessage(window, "new-tab", tabType);
            }
        }));
    });
    newTabMenu.popup({
        window: window,
        x: window.getBounds().width - 12,
        y: 10
    });
}
function select3DCameraPopup(window, options, selectedIndex) {
    const cameraMenu = new electron.Menu();
    cameraMenu.append(new electron.MenuItem({
        label: "Orbit Field",
        type: "checkbox",
        checked: selectedIndex == -1,
        click() {
            sendMessage(window, "set-3d-camera", -1);
        }
    }));
    cameraMenu.append(new electron.MenuItem({
        label: "Orbit Robot",
        type: "checkbox",
        checked: selectedIndex == -2,
        click() {
            sendMessage(window, "set-3d-camera", -2);
        }
    }));
    if (options.length > 0) {
        cameraMenu.append(new electron.MenuItem({
            type: "separator"
        }));
    }
    options.forEach((option, index) => {
        cameraMenu.append(new electron.MenuItem({
            label: option,
            type: "checkbox",
            checked: index == selectedIndex,
            click() {
                sendMessage(window, "set-3d-camera", index);
            }
        }));
    });
    cameraMenu.popup({
        window: window
    });
}
function handleDownloadMessage(message) {
    if (!downloadWindow)
        return;
    if (downloadWindow.isDestroyed())
        return;
    switch (message.name) {
        case "start":
            downloadAddress = message.data.address;
            downloadPath = message.data.path;
            if (!downloadPath.endsWith("/"))
                downloadPath += "/";
            downloadStart();
            break;
        case "close":
            downloadWindow.destroy();
            downloadStop();
            break;
        case "save":
            downloadSave(message.data);
            break;
    }
}
function downloadStart() {
    if (downloadRetryTimeout)
        clearTimeout(downloadRetryTimeout);
    if (downloadRefreshInterval)
        clearInterval(downloadRefreshInterval);
    downloadClient?.end();
    downloadFileSizeCache = {};
    downloadClient = new ssh2.Client()
        .once("ready", () => {
        downloadClient?.sftp((error, sftp) => {
            if (error) {
                downloadError(error.message);
            }
            else {
                let readFiles = () => {
                    sftp.readdir(downloadPath, (error, list) => {
                        if (error) {
                            downloadError(error.message);
                        }
                        else {
                            if (downloadWindow) {
                                sendMessage(downloadWindow, "set-list", list
                                    .map((file) => {
                                    return { name: file.filename, size: file.attrs.size };
                                })
                                    .filter((file) => !file.name.startsWith(".") && (file.name.endsWith(".rlog") || file.name.endsWith(".wpilog")))
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .reverse());
                            }
                            list.forEach((file) => {
                                downloadFileSizeCache[file.filename] = file.attrs.size;
                            });
                        }
                    });
                };
                downloadRefreshInterval = setInterval(readFiles, DOWNLOAD_REFRESH_INTERVAL_MS);
                readFiles();
            }
        });
    })
        .on("error", (error) => {
        downloadError(error.message);
    })
        .connect({
        host: downloadAddress,
        port: 22,
        readyTimeout: DOWNLOAD_CONNECT_TIMEOUT_MS,
        username: DOWNLOAD_USERNAME,
        password: DOWNLOAD_PASSWORD
    });
}
function downloadStop() {
    downloadClient?.end();
    if (downloadRetryTimeout)
        clearTimeout(downloadRetryTimeout);
    if (downloadRefreshInterval)
        clearInterval(downloadRefreshInterval);
}
function downloadError(errorMessage) {
    if (!downloadWindow)
        return;
    sendMessage(downloadWindow, "show-error", errorMessage);
    if (downloadRefreshInterval)
        clearInterval(downloadRefreshInterval);
    downloadRetryTimeout = setTimeout(downloadStart, DOWNLOAD_RETRY_DELAY_MS);
}
function downloadSave(files) {
    if (!downloadWindow)
        return;
    let selectPromise;
    if (files.length > 1) {
        selectPromise = electron.dialog.showOpenDialog(downloadWindow, {
            title: "Select save location for robot logs",
            buttonLabel: "Save",
            properties: ["openDirectory", "createDirectory", "dontAddToRecent"]
        });
    }
    else {
        let extension = path.extname(files[0]).slice(1);
        let name = extension == "wpilog" ? "WPILib robot logs" : "Robot logs";
        selectPromise = electron.dialog.showSaveDialog(downloadWindow, {
            title: "Select save location for robot log",
            defaultPath: files[0],
            properties: ["createDirectory", "showOverwriteConfirmation", "dontAddToRecent"],
            filters: [{ name: name, extensions: [extension] }]
        });
    }
    selectPromise.then((response) => {
        if (response.canceled)
            return;
        let savePath = "";
        if (files.length > 1) {
            savePath = response.filePaths[0];
        }
        else {
            savePath = response.filePath;
        }
        if (savePath != "") {
            downloadClient?.sftp((error, sftp) => {
                if (error) {
                    downloadError(error.message);
                }
                else {
                    if (downloadWindow)
                        sendMessage(downloadWindow, "set-progress", 0);
                    if (files.length == 1) {
                        sftp.fastGet(downloadPath + files[0], savePath, {
                            step: (sizeTransferred, _, sizeTotal) => {
                                if (!downloadWindow)
                                    return;
                                sendMessage(downloadWindow, "set-progress", { current: sizeTransferred, total: sizeTotal });
                            }
                        }, (error) => {
                            if (error) {
                                downloadError(error.message);
                            }
                            else {
                                if (!downloadWindow)
                                    return;
                                sendMessage(downloadWindow, "set-progress", 1);
                                electron.dialog
                                    .showMessageBox(downloadWindow, {
                                    type: "question",
                                    message: "Open log?",
                                    detail: 'Would you like to open the log file "' + path.basename(savePath) + '"?',
                                    icon: WINDOW_ICON,
                                    buttons: ["Open", "Skip"],
                                    defaultId: 0
                                })
                                    .then((result) => {
                                    if (result.response == 0) {
                                        downloadWindow?.destroy();
                                        downloadStop();
                                        hubWindows[0].focus();
                                        sendMessage(hubWindows[0], "open-file", savePath);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        let completeCount = 0;
                        let skipCount = 0;
                        let allSizesTransferred = new Array(files.length).fill(0);
                        let allSizesTotal = 0;
                        files.forEach((file, index) => {
                            let fileSize = file in downloadFileSizeCache ? downloadFileSizeCache[file] : 0;
                            allSizesTotal += fileSize;
                            fs.stat(savePath + "/" + file, (statErr) => {
                                if (statErr == null) {
                                    completeCount++;
                                    skipCount++;
                                    allSizesTotal -= fileSize;
                                    if (skipCount == files.length) {
                                        if (downloadWindow)
                                            sendMessage(downloadWindow, "show-alert", "No new logs found.");
                                    }
                                }
                                else {
                                    sftp.fastGet(downloadPath + file, savePath + "/" + file, {
                                        step: (sizeTransferred) => {
                                            allSizesTransferred[index] = sizeTransferred;
                                            if (!downloadWindow)
                                                return;
                                            let sumSizeTransferred = allSizesTransferred.reduce((a, b) => a + b, 0);
                                            sendMessage(downloadWindow, "set-progress", {
                                                current: sumSizeTransferred,
                                                total: allSizesTotal
                                            });
                                        }
                                    }, (error) => {
                                        if (error) {
                                            downloadError(error.message);
                                        }
                                        else {
                                            completeCount++;
                                            if (completeCount >= files.length) {
                                                let message;
                                                if (skipCount > 0) {
                                                    let newCount = completeCount - skipCount;
                                                    message =
                                                        "Saved " +
                                                            newCount.toString() +
                                                            " new log" +
                                                            (newCount == 1 ? "" : "s") +
                                                            " (" +
                                                            skipCount.toString() +
                                                            " skipped) to <u>" +
                                                            savePath +
                                                            "</u>";
                                                }
                                                else {
                                                    message =
                                                        "Saved " +
                                                            completeCount.toString() +
                                                            " log" +
                                                            (completeCount == 1 ? "" : "s") +
                                                            " to <u>" +
                                                            savePath +
                                                            "</u>";
                                                }
                                                if (!downloadWindow)
                                                    return;
                                                sendMessage(downloadWindow, "set-progress", 1);
                                                sendMessage(downloadWindow, "show-alert", message);
                                            }
                                        }
                                    });
                                }
                            });
                        });
                    }
                }
            });
        }
    });
}
function setupMenu() {
    const isMac = process.platform === "darwin";
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Open Log...",
                    accelerator: "CmdOrCtrl+O",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        electron.dialog
                            .showOpenDialog(window, {
                            title: "Select a robot log file to open",
                            properties: ["openFile"],
                            filters: [{ name: "Robot logs", extensions: ["rlog", "wpilog", "dslog", "dsevents"] }]
                        })
                            .then((files) => {
                            if (files.filePaths.length > 0) {
                                sendMessage(window, "open-file", files.filePaths[0]);
                            }
                        });
                    }
                },
                {
                    label: "Merge Log...",
                    accelerator: "CmdOrCtrl+Shift+O",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        electron.dialog
                            .showOpenDialog(window, {
                            title: "Select a robot log file to merge with the current data",
                            properties: ["openFile"],
                            filters: [{ name: "Robot logs", extensions: ["rlog", "wpilog", "dslog", "dsevents"] }]
                        })
                            .then((files) => {
                            if (files.filePaths.length > 0) {
                                sendMessage(window, "open-file-merge", files.filePaths[0]);
                            }
                        });
                    }
                },
                {
                    label: "Connect to Robot",
                    accelerator: "CmdOrCtrl+K",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "start-live", false);
                    }
                },
                {
                    label: "Connect to Simulator",
                    accelerator: "CmdOrCtrl+Shift+K",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "start-live", true);
                    }
                },
                {
                    label: "Download Logs...",
                    accelerator: "CmdOrCtrl+D",
                    click(_, window) {
                        if (window == null)
                            return;
                        openDownload(window);
                    }
                },
                {
                    label: "Export Data...",
                    accelerator: "CmdOrCtrl+E",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "start-export");
                    }
                },
                { type: "separator" },
                {
                    label: "Use USB roboRIO Address",
                    type: "checkbox",
                    checked: false,
                    click(item) {
                        usingUsb = item.checked;
                        sendAllPreferences();
                    }
                },
                { type: "separator" },
                {
                    label: "Export Layout...",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        electron.dialog
                            .showSaveDialog(window, {
                            title: "Select export location for layout file",
                            defaultPath: "AdvantageScope " + new Date().toLocaleDateString().replaceAll("/", "-") + ".json",
                            properties: ["createDirectory", "showOverwriteConfirmation", "dontAddToRecent"],
                            filters: [{ name: "JSON files", extensions: ["json"] }]
                        })
                            .then((response) => {
                            if (!response.canceled) {
                                let hubState = hubStateTracker.getRendererState(window);
                                jsonfile.writeFile(response.filePath, {
                                    version: electron.app.isPackaged ? electron.app.getVersion() : "dev",
                                    layout: hubState.tabs.tabs
                                }, { spaces: 2 });
                            }
                        });
                    }
                },
                {
                    label: "Import Layout...",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        electron.dialog
                            .showOpenDialog(window, {
                            title: "Select one or more layout files to import",
                            properties: ["openFile", "multiSelections"],
                            filters: [{ name: "JSON files", extensions: ["json"] }]
                        })
                            .then((files) => {
                            if (files.filePaths.length > 0) {
                                let data = jsonfile.readFileSync(files.filePaths[0]);
                                if (!("version" in data && "layout" in data && Array.isArray(data.layout))) {
                                    electron.dialog.showMessageBox(window, {
                                        type: "error",
                                        title: "Error",
                                        message: "Failed to import layout",
                                        detail: "The selected layout file was not a recognized format.",
                                        icon: WINDOW_ICON
                                    });
                                    return;
                                }
                                if (files.filePaths.length > 1) {
                                    for (const file of files.filePaths.slice(1)) {
                                        let additionalLayout = jsonfile.readFileSync(file);
                                        if ("version" in additionalLayout &&
                                            "layout" in additionalLayout &&
                                            Array.isArray(additionalLayout.layout) &&
                                            additionalLayout.version == data.version) {
                                            data.layout = data.layout.concat(additionalLayout.layout);
                                        }
                                    }
                                }
                                let currentVersion = electron.app.isPackaged ? electron.app.getVersion() : "dev";
                                if (data.version !== currentVersion) {
                                    let result = electron.dialog.showMessageBoxSync(window, {
                                        type: "warning",
                                        title: "Warning",
                                        message: "Version mismatch",
                                        detail: "The layout file was generated by a different version of AdvantageScope. Compatability is not guaranteed.",
                                        buttons: ["Continue", "Cancel"],
                                        icon: WINDOW_ICON
                                    });
                                    if (result != 0)
                                        return;
                                }
                                let hubState = jsonCopy(hubStateTracker.getRendererState(window));
                                hubState.tabs.tabs = data.layout;
                                sendMessage(window, "restore-state", hubState);
                            }
                        });
                    }
                },
                { type: "separator" },
                {
                    label: "New Window",
                    accelerator: "CommandOrControl+N",
                    click() {
                        createHubWindow();
                    }
                },
                { role: "close", accelerator: "Shift+CmdOrCtrl+W" }
            ]
        },
        { role: "editMenu" },
        { role: "viewMenu" },
        {
            label: "Tabs",
            submenu: [
                {
                    label: "New Tab",
                    submenu: getAllTabTypes()
                        .slice(1)
                        .map((tabType, index) => {
                        return {
                            label: getTabIcon(tabType) + " " + getDefaultTabTitle(tabType),
                            accelerator: index < 9 ? "CmdOrCtrl+" + (index + 1).toString() : "",
                            click(_, window) {
                                if (window == null || !hubWindows.includes(window))
                                    return;
                                sendMessage(window, "new-tab", tabType);
                            }
                        };
                    })
                },
                {
                    label: "New Tab (Popup)",
                    visible: false,
                    accelerator: "CmdOrCtrl+T",
                    click(_, window) {
                        if (window)
                            newTabPopup(window);
                    }
                },
                { type: "separator" },
                {
                    label: "Previous Tab",
                    accelerator: "CmdOrCtrl+Left",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "move-tab", -1);
                    }
                },
                {
                    label: "Next Tab",
                    accelerator: "CmdOrCtrl+Right",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "move-tab", 1);
                    }
                },
                { type: "separator" },
                {
                    label: "Shift Left",
                    accelerator: "CmdOrCtrl+[",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "shift-tab", -1);
                    }
                },
                {
                    label: "Shift Right",
                    accelerator: "CmdOrCtrl+]",
                    click(_, window) {
                        if (window == null || !hubWindows.includes(window))
                            return;
                        sendMessage(window, "shift-tab", 1);
                    }
                },
                { type: "separator" },
                {
                    label: "Close Tab",
                    accelerator: "CmdOrCtrl+W",
                    click(_, window) {
                        if (window == null)
                            return;
                        if (hubWindows.includes(window)) {
                            sendMessage(window, "close-tab");
                        }
                        else {
                            window.destroy();
                        }
                    }
                }
            ]
        },
        { role: "windowMenu" },
        {
            role: "help",
            submenu: [
                {
                    label: "Show FRC Data Folder",
                    click() {
                        electron.shell.openPath(EXTRA_FRC_DATA);
                    }
                },
                { type: "separator" },
                {
                    label: "Report a Problem",
                    click() {
                        electron.shell.openExternal("https://github.com/" + REPOSITORY + "/issues");
                    }
                },
                {
                    label: "View Repository",
                    click() {
                        electron.shell.openExternal("https://github.com/" + REPOSITORY);
                    }
                },
                {
                    label: "Team Website",
                    click() {
                        electron.shell.openExternal("https://littletonrobotics.org");
                    }
                }
            ]
        }
    ];
    if (isMac) {
        template.splice(0, 0, {
            role: "appMenu",
            submenu: [
                { role: "about" },
                { type: "separator" },
                {
                    label: "Preferences...",
                    accelerator: "Cmd+,",
                    click(_, window) {
                        if (window == null)
                            return;
                        openPreferences(window);
                    }
                },
                {
                    label: "Check for Updates...",
                    click() {
                        checkForUpdate(true);
                    }
                },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" }
            ]
        });
    }
    else {
        template[template.length - 1].submenu.splice(0, 0, {
            label: "About AdvantageScope",
            click() {
                electron.dialog.showMessageBox({
                    type: "info",
                    title: "About",
                    message: "AdvantageScope",
                    detail: "Version: " + electron.app.getVersion() + "\nPlatform: " + process.platform + "-" + process.arch,
                    buttons: ["Close"],
                    icon: WINDOW_ICON
                });
            }
        }, {
            label: "Show Preferences...",
            accelerator: "Ctrl+,",
            click(_, window) {
                if (window == null)
                    return;
                openPreferences(window);
            }
        }, {
            label: "Check for Updates...",
            click() {
                checkForUpdate(true);
            }
        }, { type: "separator" });
    }
    const menu = electron.Menu.buildFromTemplate(template);
    electron.Menu.setApplicationMenu(menu);
}
function createHubWindow() {
    let prefs = {
        minWidth: 800,
        minHeight: 400,
        icon: WINDOW_ICON,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    };
    let focusedWindow = electron.BrowserWindow.getFocusedWindow();
    let rendererState = null;
    const defaultWidth = 1100;
    const defaultHeight = 650;
    if (hubWindows.length == 0) {
        let state = hubStateTracker.getState(defaultWidth, defaultHeight);
        prefs.x = state.x;
        prefs.y = state.y;
        prefs.width = state.width;
        prefs.height = state.height;
        if (state.rendererState)
            rendererState = state.rendererState;
    }
    else if (focusedWindow != null) {
        let bounds = focusedWindow.getBounds();
        prefs.x = bounds.x + 30;
        prefs.y = bounds.y + 30;
        prefs.width = bounds.width;
        prefs.height = bounds.height;
    }
    else {
        prefs.width = defaultWidth;
        prefs.height = defaultHeight;
    }
    if (process.platform == "darwin") {
        prefs.vibrancy = "sidebar";
        if (Number(os.release().split(".")[0]) >= 20)
            prefs.titleBarStyle = "hiddenInset";
    }
    let window = new electron.BrowserWindow(prefs);
    hubWindows.push(window);
    if (!electron.app.isPackaged)
        window.webContents.openDevTools();
    window.once("ready-to-show", window.show);
    let firstLoad = true;
    let createPorts = () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        window.webContents.postMessage("port", null, [port1]);
        windowPorts[window.id] = port2;
        port2.on("message", (event) => {
            handleHubMessage(window, event.data);
        });
        port2.start();
    };
    createPorts();
    window.webContents.on("dom-ready", () => {
        if (!firstLoad) {
            createPorts();
            rlogSockets[window.id]?.destroy();
        }
        sendMessage(window, "set-frc-data", frcData);
        sendMessage(window, "set-fullscreen", window.isFullScreen());
        sendMessage(window, "set-battery", electron.powerMonitor.isOnBatteryPower());
        sendMessage(window, "set-version", {
            platform: process.platform,
            platformRelease: os.release(),
            appVersion: electron.app.isPackaged ? electron.app.getVersion() : "dev"
        });
        sendMessage(window, "show-update-button", updateChecker.getShouldPrompt());
        sendAllPreferences();
        if (firstLoad) {
            if (rendererState)
                sendMessage(window, "restore-state", rendererState);
        }
        else {
            sendMessage(window, "restore-state", hubStateTracker.getRendererState(window));
        }
        firstLoad = false;
    });
    window.on("enter-full-screen", () => sendMessage(window, "set-fullscreen", true));
    window.on("leave-full-screen", () => sendMessage(window, "set-fullscreen", false));
    window.on("blur", () => sendMessage(window, "set-focused", false));
    window.on("focus", () => {
        sendMessage(window, "set-focused", true);
        hubStateTracker.setFocusedWindow(window);
        hubWindows.splice(hubWindows.indexOf(window), 1);
        hubWindows.splice(0, 0, window);
    });
    electron.powerMonitor.on("on-ac", () => sendMessage(window, "set-battery", false));
    electron.powerMonitor.on("on-battery", () => sendMessage(window, "set-battery", true));
    window.loadFile(path.join(__dirname, "../www/hub.html"));
    return window;
}
function createEditRangeWindow(parentWindow, range, callback) {
    const editWindow = new electron.BrowserWindow({
        width: 300,
        height: process.platform == "win32" ? 125 : 108,
        useContentSize: true,
        resizable: false,
        icon: WINDOW_ICON,
        show: false,
        parent: parentWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    editWindow.setMenu(null);
    editWindow.once("ready-to-show", parentWindow.show);
    editWindow.webContents.on("dom-ready", () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        editWindow.webContents.postMessage("port", null, [port1]);
        port2.postMessage(range);
        port2.on("message", (event) => {
            editWindow.destroy();
            callback(event.data);
        });
        editWindow.on("blur", () => port2.postMessage({ isFocused: false }));
        editWindow.on("focus", () => port2.postMessage({ isFocused: true }));
        port2.start();
    });
    editWindow.loadFile(path.join(__dirname, "../www/editRange.html"));
}
function createUnitConversionWindow(parentWindow, unitConversion, callback) {
    const unitConversionWindow = new electron.BrowserWindow({
        width: 300,
        height: process.platform == "win32" ? 179 : 162,
        useContentSize: true,
        resizable: false,
        icon: WINDOW_ICON,
        show: false,
        parent: parentWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    unitConversionWindow.setMenu(null);
    unitConversionWindow.once("ready-to-show", parentWindow.show);
    unitConversionWindow.webContents.on("dom-ready", () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        unitConversionWindow.webContents.postMessage("port", null, [port1]);
        port2.postMessage(unitConversion);
        port2.on("message", (event) => {
            unitConversionWindow.destroy();
            callback(event.data);
        });
        unitConversionWindow.on("blur", () => port2.postMessage({ isFocused: false }));
        unitConversionWindow.on("focus", () => port2.postMessage({ isFocused: true }));
        port2.start();
    });
    unitConversionWindow.loadFile(path.join(__dirname, "../www/unitConversion.html"));
}
function createRenameTabWindow(parentWindow, name, callback) {
    const renameTabWindow = new electron.BrowserWindow({
        width: 300,
        height: process.platform == "win32" ? 98 : 81,
        useContentSize: true,
        resizable: false,
        icon: WINDOW_ICON,
        show: false,
        parent: parentWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    renameTabWindow.setMenu(null);
    renameTabWindow.once("ready-to-show", parentWindow.show);
    renameTabWindow.webContents.on("dom-ready", () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        renameTabWindow.webContents.postMessage("port", null, [port1]);
        port2.postMessage(name);
        port2.on("message", (event) => {
            renameTabWindow.destroy();
            callback(event.data);
        });
        renameTabWindow.on("blur", () => port2.postMessage({ isFocused: false }));
        renameTabWindow.on("focus", () => port2.postMessage({ isFocused: true }));
        port2.start();
    });
    renameTabWindow.loadFile(path.join(__dirname, "../www/renameTab.html"));
}
function createExportWindow(parentWindow, currentLogPath) {
    const exportWindow = new electron.BrowserWindow({
        width: 300,
        height: process.platform == "win32" ? 179 : 162,
        useContentSize: true,
        resizable: false,
        icon: WINDOW_ICON,
        show: false,
        parent: parentWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    exportWindow.setMenu(null);
    exportWindow.once("ready-to-show", parentWindow.show);
    exportWindow.webContents.on("dom-ready", () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        exportWindow.webContents.postMessage("port", null, [port1]);
        port2.on("message", (event) => {
            if (event.data === null) {
                exportWindow.destroy();
            }
            else if (typeof event.data === "string") {
                electron.shell.openExternal(event.data);
            }
            else if (typeof event.data === "object") {
                let exportOptions = event.data;
                let extension = exportOptions.format == "wpilog" ? "wpilog" : "csv";
                let defaultPath = undefined;
                if (currentLogPath !== null) {
                    let pathComponents = currentLogPath.split(".");
                    pathComponents.pop();
                    defaultPath = pathComponents.join(".") + "." + extension;
                }
                electron.dialog
                    .showSaveDialog(exportWindow, {
                    title: "Select export location for robot log",
                    defaultPath: defaultPath,
                    properties: ["createDirectory", "showOverwriteConfirmation", "dontAddToRecent"],
                    filters: [
                        extension == "csv"
                            ? { name: "Comma-separated values", extensions: ["csv"] }
                            : { name: "WPILib robot logs", extensions: ["wpilog"] }
                    ]
                })
                    .then((response) => {
                    if (!response.canceled) {
                        exportWindow.destroy();
                        sendMessage(parentWindow, "prepare-export", { path: response.filePath, options: exportOptions });
                    }
                });
            }
        });
        exportWindow.on("blur", () => port2.postMessage({ isFocused: false }));
        exportWindow.on("focus", () => port2.postMessage({ isFocused: true }));
        port2.start();
    });
    exportWindow.loadFile(path.join(__dirname, "../www/export.html"));
}
function createSatellite(parentWindow, uuid, type) {
    const width = 900;
    const height = 500;
    const satellite = new electron.BrowserWindow({
        width: width,
        height: height,
        x: Math.floor(parentWindow.getBounds().x + parentWindow.getBounds().width / 2 - width / 2),
        y: Math.floor(parentWindow.getBounds().y + parentWindow.getBounds().height / 2 - height / 2),
        minWidth: 200,
        minHeight: 100,
        resizable: true,
        icon: WINDOW_ICON,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    satellite.setMenu(null);
    satellite.once("ready-to-show", satellite.show);
    satellite.loadFile(path.join(__dirname, "../www/satellite.html"));
    satellite.webContents.on("dom-ready", () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        satellite.webContents.postMessage("port", null, [port1]);
        windowPorts[satellite.id] = port2;
        port2.on("message", (event) => {
            let message = event.data;
            switch (message.name) {
                case "set-aspect-ratio":
                    let aspectRatio = message.data;
                    if (aspectRatio === null) {
                        satellite.setAspectRatio(0);
                    }
                    else {
                        let originalSize = satellite.getContentSize();
                        let originalArea = originalSize[0] * originalSize[1];
                        let newY = Math.sqrt(originalArea / aspectRatio);
                        let newX = aspectRatio * newY;
                        satellite.setAspectRatio(aspectRatio);
                        satellite.setContentSize(Math.round(newX), Math.round(newY));
                    }
                    break;
                case "ask-3d-camera":
                    select3DCameraPopup(satellite, message.data.options, message.data.selectedIndex);
                    break;
            }
        });
        port2.start();
        sendMessage(satellite, "set-frc-data", frcData);
        sendMessage(satellite, "set-type", type);
        sendAllPreferences();
    });
    if (!(uuid in satelliteWindows)) {
        satelliteWindows[uuid] = [];
    }
    satelliteWindows[uuid].push(satellite);
    let closed = false;
    parentWindow.once("close", () => {
        if (!closed)
            satellite.close();
    });
    satellite.once("closed", () => {
        closed = true;
        satelliteWindows[uuid].splice(satelliteWindows[uuid].indexOf(satellite), 1);
    });
}
function openPreferences(parentWindow) {
    if (prefsWindow != null && !prefsWindow.isDestroyed()) {
        prefsWindow.focus();
        return;
    }
    const width = 400;
    const height = process.platform == "win32" ? 303 : 243;
    prefsWindow = new electron.BrowserWindow({
        width: width,
        height: height,
        x: Math.floor(parentWindow.getBounds().x + parentWindow.getBounds().width / 2 - width / 2),
        y: Math.floor(parentWindow.getBounds().y + parentWindow.getBounds().height / 2 - height / 2),
        useContentSize: true,
        resizable: false,
        alwaysOnTop: true,
        icon: WINDOW_ICON,
        show: false,
        fullscreenable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    prefsWindow.setMenu(null);
    prefsWindow.once("ready-to-show", prefsWindow.show);
    prefsWindow.webContents.on("dom-ready", () => {
        const { port1, port2 } = new electron.MessageChannelMain();
        prefsWindow?.webContents.postMessage("port", null, [port1]);
        port2.postMessage({ platform: process.platform, prefs: jsonfile.readFileSync(PREFS_FILENAME) });
        port2.on("message", (event) => {
            prefsWindow?.destroy();
            jsonfile.writeFileSync(PREFS_FILENAME, event.data);
            sendAllPreferences();
        });
        prefsWindow?.on("blur", () => port2.postMessage({ isFocused: false }));
        prefsWindow?.on("focus", () => port2.postMessage({ isFocused: true }));
        port2.start();
    });
    prefsWindow.loadFile(path.join(__dirname, "../www/preferences.html"));
}
function openDownload(parentWindow) {
    if (downloadWindow != null && !downloadWindow.isDestroyed()) {
        downloadWindow.focus();
        return;
    }
    const width = 500;
    const height = 500;
    downloadWindow = new electron.BrowserWindow({
        width: width,
        height: height,
        minWidth: width,
        minHeight: height,
        x: Math.floor(parentWindow.getBounds().x + parentWindow.getBounds().width / 2 - width / 2),
        y: Math.floor(parentWindow.getBounds().y + parentWindow.getBounds().height / 2 - height / 2),
        resizable: true,
        alwaysOnTop: true,
        icon: WINDOW_ICON,
        show: false,
        fullscreenable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    downloadWindow.setMenu(null);
    downloadWindow.once("ready-to-show", downloadWindow.show);
    downloadWindow.once("close", downloadStop);
    downloadWindow.webContents.on("dom-ready", () => {
        if (downloadWindow == null)
            return;
        const { port1, port2 } = new electron.MessageChannelMain();
        downloadWindow.webContents.postMessage("port", null, [port1]);
        windowPorts[downloadWindow.id] = port2;
        port2.on("message", (event) => {
            if (downloadWindow)
                handleDownloadMessage(event.data);
        });
        port2.start();
        sendMessage(downloadWindow, "set-platform", process.platform);
        sendAllPreferences();
    });
    downloadWindow.on("blur", () => sendMessage(downloadWindow, "set-focused", false));
    downloadWindow.on("focus", () => sendMessage(downloadWindow, "set-focused", true));
    downloadWindow.loadFile(path.join(__dirname, "../www/download.html"));
}
if (process.platform == "linux" && fs.existsSync(PREFS_FILENAME)) {
    let prefs = jsonfile.readFileSync(PREFS_FILENAME);
    if (prefs.theme == "dark") {
        process.env["GTK_THEME"] = "Adwaita:dark";
    }
}
function checkForUpdate(alwaysPrompt) {
    updateChecker.check().then(() => {
        hubWindows.forEach((window) => {
            sendMessage(window, "show-update-button", updateChecker.getShouldPrompt());
        });
        if (alwaysPrompt) {
            updateChecker.showPrompt();
        }
    });
}
electron.app.whenReady().then(() => {
    if (!fs.existsSync(PREFS_FILENAME)) {
        jsonfile.writeFileSync(PREFS_FILENAME, DEFAULT_PREFS);
        electron.nativeTheme.themeSource = DEFAULT_PREFS.theme;
    }
    else {
        let oldPrefs = jsonfile.readFileSync(PREFS_FILENAME);
        let prefs = DEFAULT_PREFS;
        if ("theme" in oldPrefs &&
            (oldPrefs.theme === "light" || oldPrefs.theme === "dark" || oldPrefs.theme === "system")) {
            prefs.theme = oldPrefs.theme;
        }
        if ("rioAddress" in oldPrefs && typeof oldPrefs.rioAddress === "string") {
            prefs.rioAddress = oldPrefs.rioAddress;
        }
        if ("address" in oldPrefs && typeof oldPrefs.address === "string") {
            prefs.rioAddress = oldPrefs.address;
        }
        if ("rioPath" in oldPrefs && typeof oldPrefs.rioPath === "string") {
            prefs.rioPath = oldPrefs.rioPath;
        }
        if ("liveMode" in oldPrefs &&
            (oldPrefs.liveMode === "nt4" || oldPrefs.liveMode === "nt4-akit" || oldPrefs.liveMode === "rlog")) {
            prefs.liveMode = oldPrefs.liveMode;
        }
        if ("liveSubscribeMode" in oldPrefs &&
            (oldPrefs.liveSubscribeMode === "low-bandwidth" || oldPrefs.liveSubscribeMode === "logging")) {
            prefs.liveSubscribeMode = oldPrefs.liveSubscribeMode;
        }
        if ("rlogPort" in oldPrefs && typeof oldPrefs.rlogPort == "number") {
            prefs.rlogPort = oldPrefs.rlogPort;
        }
        if ("threeDimensionMode" in oldPrefs &&
            (oldPrefs.threeDimensionMode === "quality" ||
                oldPrefs.threeDimensionMode === "efficiency" ||
                oldPrefs.threeDimensionMode === "auto")) {
            prefs.threeDimensionMode = oldPrefs.threeDimensionMode;
        }
        jsonfile.writeFileSync(PREFS_FILENAME, prefs);
        electron.nativeTheme.themeSource = prefs.theme;
    }
    createExtraFRCDataFolder();
    frcData = loadFRCData();
    setupMenu();
    let window = createHubWindow();
    if (electron.app.isPackaged) {
        if (process.argv.length > 1) {
            firstOpenPath = process.argv[1];
        }
    }
    else {
        if (process.argv.length > 2) {
            firstOpenPath = process.argv[2];
        }
    }
    if (firstOpenPath != null) {
        sendMessage(window, "open-file", firstOpenPath);
    }
    electron.app.on("activate", () => {
        if (electron.BrowserWindow.getAllWindows().length == 0)
            createHubWindow();
    });
    checkForUpdate(false);
});
electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron.app.quit();
});
electron.app.on("open-file", (_, path) => {
    if (electron.app.isReady()) {
        let window = createHubWindow();
        sendMessage(window, "open-file", path);
    }
    else {
        firstOpenPath = path;
    }
});
electron.app.on("quit", () => {
    fs.unlink(LAST_OPEN_FILE, () => { });
    Object.values(videoProcesses).forEach((process) => {
        process.kill();
    });
    videoFolderUUIDs.forEach((uuid) => {
        fs.rmSync(path.join(VIDEO_CACHE, uuid), { recursive: true });
    });
});
