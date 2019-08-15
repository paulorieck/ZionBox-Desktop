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

        const windows_shortcut = require("create-windows-shortcut");
    
        var origin_path = path.join(__dirname, "startup.vbs");
    
        //////////////////////////////////////
        // Creates icon on user's Destkop
    
        windows_shortcut.createShortcut(origin_path, os.homedir()+"\\Desktop", "ZionBox", __dirname+"\\favicon.ico", function () {
            console.log("Shortcut on desktop successfully created!");
        });
    
        //////////////////////////////////////
        // Creates icon on user's Menu

        windows_shortcut.createShortcut(origin_path, os.homedir()+"\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs", __dirname+"\\favicon.ico", "ZionBox", function () {
            console.log("Shortcut on menu successfully created!");
        });
    
    }

});

