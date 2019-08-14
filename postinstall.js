#!/usr/bin/env node

const os = require('os');
const path = require('path');
const {exec} = require('child_process');

var plataform_dependent_modules_installation = exec("node node_modules/platform-dependent-modules/cli.js");

plataform_dependent_modules_installation.stdout.on('data', (data) => {
    console.log(`plataform_dependent_modules_installation => stdout: ${data}`);
});

plataform_dependent_modules_installation.stderr.on('data', (data) => {
    console.log(`plataform_dependent_modules_installation => stderr: ${data}`);
});

plataform_dependent_modules_installation.on('close', (code) => {

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

});

