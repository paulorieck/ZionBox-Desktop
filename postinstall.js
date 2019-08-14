#!/usr/bin/env node

const os = require('os');
const path = require('path');

if ( os.platform() === "win32" ) {

    const windows_shortcut_vbs = require("windows-shortcut-vbs");

    var origin_path = path.join(__dirname, "startup.vbs");

    //////////////////////
    // Creates icon on user's Destkop

    windows_shortcut_vbs.createShortcutInSpecialFolder("Desktop", origin_path, "ZionBox").then( (shortcutPath) => {
        console.log(`Shortcut path: ${shortcutPath}`);
    }).catch( (err) => {
        console.log(err);
    });

    //////////////////////
    // Creates icon on user's Menu

    //%AppData%\Microsoft\Windows\Start Menu\Programs
    windows_shortcut_vbs.createShortcutInSpecialFolder("AppData\\Microsoft\\Windows\\Start Menu\\Programs", origin_path, "ZionBox").then( (shortcutPath) => {
        console.log(`Shortcut path: ${shortcutPath}`);
    }).catch( (err) => {
        console.log(err);
    });

}