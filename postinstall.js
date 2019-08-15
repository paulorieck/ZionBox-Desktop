#!/usr/bin/env node

const os = require('os');
const path = require('path');
const {spawn} = require('child_process');

var args = [__dirname+"/node_modules/platform-dependent-modules/cli.js"];
var options = {
    cwd: __dirname,
    spawn: false
}

console.log("node "+__dirname+"/node_modules/platform-dependent-modules/cli.js");
var platform_dependent_modules_installation = spawn("node", args, options);

platform_dependent_modules_installation.stdout.on('data', (data) => {
    console.log(`platform_dependent_modules_installation => stdout: ${data}`);
});

platform_dependent_modules_installation.stderr.on('data', (data) => {
    console.log(`plataform_dependent_modules_installation => stderr: ${data}`);
});

platform_dependent_modules_installation.on('close', (code) => {

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

        windows_shortcut.createShortcut(origin_path, os.homedir()+"\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs", "ZionBox", __dirname+"\\favicon.ico", function () {
            console.log("Shortcut on menu successfully created!");
        });
    
    } else if ( os.platform() === "darwin" ) {

        var ncp = require('ncp').ncp;

        // Copy ZionBox.app to /Applications/
        ncp('ZionBox.app', '/Applications/ZionBox.app', (err) => {
            if (err) {
                console.log(err);
            }
            console.log('source.txt was copied to destination.txt');
        });

    }

});

