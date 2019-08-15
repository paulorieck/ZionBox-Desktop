#!/usr/bin/env node

const {exec} = require('child_process');

///////////////////////////

const install_node_gyp = exec("npm list node-gyp -g || npm i -g node-gyp");

install_node_gyp.stdout.on('data', (data) => {
    console.log(`install_node-gyp => stdout: ${data}`);
});

install_node_gyp.stderr.on('data', (data) => {
  console.log(`install_node-gyp => stderr: ${data}`);
});

install_node_gyp.on('close', (code) => {
  
    console.log(`install_node-gyp => child process exited with code ${code}`);

    ///////////////////////////

    const install_electron = exec("npm list electron -g || npm i -g electron");
    install_electron.stdout.on('data', (data) => {
        console.log(`install_electron => stdout: ${data}`);
    });

    install_electron.stderr.on('data', (data) => {
    console.log(`install_electron => stderr: ${data}`);
    });

    install_electron.on('close', (code) => {

        console.log(`install_electron => child process exited with code ${code}`);

    });

    

});