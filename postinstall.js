#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const {exec, spawn} = require('child_process');

///////////////////////////

// Create folders that are necessary if they don't exists yet
var homedir = os.homedir();
if ( !fs.existsSync(path.join(homedir, ".zionbox-service")) ) {

    fs.mkdirSync(path.join(homedir, ".zionbox-service"));

    if ( !fs.existsSync(path.join(homedir, ".zionbox-service/temp_files")) ) {
        fs.mkdirSync(path.join(homedir, ".zionbox-service/temp_files"));
    }

    if ( !fs.existsSync(path.join(homedir, ".zionbox-service/exported_files")) ) {
        fs.mkdirSync(path.join(homedir, ".zionbox-service/exported_files"));
    }

} else {

    if ( !fs.existsSync(path.join(homedir, ".zionbox-service/temp_files")) ) {
        fs.mkdirSync(path.join(homedir, ".zionbox-service/temp_files"));
    }

    if ( !fs.existsSync(path.join(homedir, ".zionbox-service/exported_files")) ) {
        fs.mkdirSync(path.join(homedir, ".zionbox-service/exported_files"));
    }

}

if ( !fs.existsSync(path.join(homedir, ".zionbox-service/configs.json")) ) {
    fs.writeFileSync(path.join(homedir, ".zionbox-service/configs.json"), JSON.stringify({"server": "", "ipfsAPI": "", "mirrorsSwarms": "", "mirrors": "", "relaysSwarms": ""}));
}

///////////////////////////

const install_pm2 = exec("npm list pm2 -g || npm i -g pm2");
install_pm2.stdout.on('data', (data) => {
    console.log(`install_pm2 => stdout: ${data}`);
});

install_pm2.stderr.on('data', (data) => {
console.log(`install_pm2 => stderr: ${data}`);
});

install_pm2.on('close', (code) => {

    console.log(`install_pm2 => child process exited with code ${code}`);

    // Configure PM2 to start zionbox-service automatically on startup
    const configure_pm2 = exec("pm2 start zionboxservice");

    configure_pm2.stderr.on('data', (data) => {
        console.log(`configure_pm2 => stderr: ${data}`);
    });

    install_pm2.on('close', (code) => {
        console.log(`configure_pm2 => child process exited with code ${code}`);
    });

});

/////////////////////////////////////////////////////////////

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
            console.log('Shortcut successfully created!');
        });

    }

});

