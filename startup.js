#!/usr/bin/env node

const {spawn} = require('child_process');

var args = [__dirname+"/."];

const options = {
  cwd: __dirname,
  spawn: false
}

const electron = spawn("electron", args, options);

electron.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

electron.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

electron.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});