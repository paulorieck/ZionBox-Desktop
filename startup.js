#!/usr/bin/env node

const {exec} = require('child_process');

const electron = exec("electron "+__dirname);

electron.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

electron.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

electron.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});