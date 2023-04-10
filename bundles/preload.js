'use strict';

var electron = require('electron');

const windowLoaded = new Promise((resolve) => {
    window.onload = resolve;
});
electron.ipcRenderer.on("port", async (event) => {
    await windowLoaded;
    window.postMessage("port", "*", event.ports);
});
