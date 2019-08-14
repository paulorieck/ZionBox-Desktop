const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const npmAutoUpdate = new (require('npm-auto-update'))(console);
const notifier = require('node-notifier');
const osLocale = require('os-locale');
const fs = require('fs');
const path = require('path');

const {rword} = require('./rword/dist/rword');
rword.load('small_pt-BR');

(async () => {
    console.log(await osLocale());
    //=> 'en-US'
})();

var metadata;

var current_importation = {};
var total_imported_size = 0;

function createWindow () {
    
    // Create the browser window.
    win = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.maximize();

    //win.webContents.openDevTools();

    // and load the index.html of the app.
    win.loadFile('index.html');

}

function listenIPCMain() {

    ipcMain.on('getBinary', (event, metadata_hash) => {
        global.ipc.emit('message', JSON.stringify({"op": "getBinary", "metadata_hash": metadata_hash}));
    });
    
    ipcMain.on('importLocalFolder', (event, variable) => {
    
        const options = {
            title: 'Selecione uma pasta para importar',
            properties: ['openDirectory']
        };
    
        dialog.showOpenDialog(null, options, (foldersPaths) => {
            if ( typeof foldersPaths !== "undefined" ) {
                global.ipc.emit('message', JSON.stringify({"op": "importLocalFolders", 'foldersPaths': foldersPaths}));
            }
        });
    
    });
    
    ipcMain.on('createNewCredential', (event, data) => {
        data = JSON.parse(data);
        global.ipc.emit('message', JSON.stringify({"op": "createNewCredential", 'username': data.username, 'password': data.password}));
    });
    
    ipcMain.on('getSwarmsList', (event, data) => {
        global.ipc.emit('message', JSON.stringify({"op": "getSwarmsList"}));
    });
    
    ipcMain.on('getConfigs', (event, data) => {
        global.ipc.emit('message', JSON.stringify({"op": "getConfigs"}));
    });
    
    ipcMain.on('addSwarmPair', (event, data) => {
        data = JSON.parse(data);
        global.ipc.emit('message', JSON.stringify({"op": "addSwarmPair", "address": data.address}));
    });
    
    ipcMain.on('rmSwarmPair', (event, data) => {
        data = JSON.parse(data);
        global.ipc.emit('message', JSON.stringify({"op": "rmSwarmPair", "address": data.address}));
    });
    
    ipcMain.on('checkCredentials', (event, data) => {
        data = JSON.parse(data);
        global.ipc.emit('message', JSON.stringify({"op": "doLogin", 'username': data.username, 'password': data.password}));
    });
    
    ipcMain.on('createRootDirectory', (event, name) => {
        global.ipc.emit('message', JSON.stringify({"op": "createRootDirectory", 'name': name}));
    });
    
    ipcMain.on('createSubdirectory', (event, obj) => {
        obj = JSON.parse(obj);
        global.ipc.emit('message', JSON.stringify({"op": "createSubdirectory", 'name': obj.name, 'metadata_hash': obj.metadata_hash}));
    });
    
    ipcMain.on('addFile', (event, obj) => {
        obj = JSON.parse(obj);
        global.ipc.emit('message', JSON.stringify({"op": "addFile", 'path': obj.path, 'metadata_hash': obj.metadata_hash, 'encrypt': obj.encrypt}));
    });
    
    ipcMain.on('remove', (event, metadata_hash) => {
        global.ipc.emit('message', JSON.stringify({"op": "remove", 'metadata_hash': metadata_hash}));
    });
    
    ipcMain.on('importPublicHash', (event, obj) => {
        obj = JSON.parse(obj);
        global.ipc.emit('message', JSON.stringify({"op": "importPublicHash", 'hash': obj.hash, 'parent_location_hash': obj.parent_location_hash, 'name': obj.name}));
    });
    
    ipcMain.on('setConfigs', (event, obj) => {
        obj = JSON.parse(obj);
        global.ipc.emit('message', JSON.stringify({"op": "setConfigs", "server": obj.server, "ipfsAPI": obj.ipfsAPI, "mirrorsSwarms": obj.mirrorsSwarms, "mirrors": obj.mirrors, "relaysSwarms": obj.relaysSwarms}));
    });
    
    ipcMain.on('shareRoot', (event, metadata_hash) => {
        
        var words = rword.generate(6);
    
        var wordsStr = "";
        for (var i = 0; i < words.length; i++) {
            if ( i === 0 ) {
                wordsStr = wordsStr + words[i];
            } else {
                wordsStr = wordsStr+" "+words[i];
            }
        }
    
        global.ipc.emit('message', JSON.stringify({"op": "shareRoot", 'metadata_hash': metadata_hash, 'passphrase': wordsStr}));
    
    });
    
    ipcMain.on('importShare', (event, obj) => {
        obj = JSON.parse(obj);
        global.ipc.emit('message', JSON.stringify({"op": "importShare", "file_path": obj.file_path, "passphrase": obj.passphrase}));
    });

}

//app.on('ready', createWindow);
app.on('ready', function () {

    npmAutoUpdate.checkForUpdate((error, result) => {

        if ( result ) {

            console.log("Updating ZionBox-Desktop");

            npmAutoUpdate.updatePackage((error, result) => {

                createWindow();
                connectToIPCServer();
                listenIPCMain();

            });

        } else {

            console.log("ZionBox-Desktop is up to date");

            createWindow();
            connectToIPCServer();
            listenIPCMain();

        }

    });

});

function connectToIPCServer() {

    const ipc = require('node-ipc');

    ipc.config.id = 'IPFSSyncroDesktop';
    ipc.config.retry = 1500;
    ipc.config.silent = true;

    ipc.connectTo(
        'IPFSSyncroService',
        function () {

            ipc.of.IPFSSyncroService.on(
                'connect',
                function () {

                    global.ipc = ipc.of.IPFSSyncroService;
                    
                    ipc.log('## connected to IPFSSyncroService ##'.rainbow, ipc.config.delay);
                    global.ipc.emit('message', JSON.stringify({"op": "isLoggedIn"}));
                    global.ipc.emit('message', JSON.stringify({"op": "getGateway"}));

                }
            );

            ipc.of.IPFSSyncroService.on(
                'disconnect',
                function () {
                    ipc.log('disconnected from IPFSSyncroService'.notice);
                }
            );

            ipc.of.IPFSSyncroService.on(
                'message',
                function (data) {

                    var messageObj = JSON.parse(data);

                    if ( messageObj.op === "returnGetAllMetadata" ) {

                        console.log("Received metadata from service.");

                        metadata = messageObj.metadata;
                        win.webContents.executeJavaScript("loadFiles('"+JSON.stringify(metadata)+"')");

                    } else if ( messageObj.op === "notifyImportationSize" ) {

                        total_imported_size = 0;

                        current_importation = {};
                        current_importation.size = messageObj.size;
                        current_importation.root_name = messageObj.root_name;

                        var sizeStr = "";
                        if ( current_importation.size > 1024*1024*1024 ) { // GB
                            var perc = current_importation.size / (1024*1024*1024);
                            sizeStr = (Math.round(perc * 100) / 100)+" GB";
                        } else if ( current_importation.size > 1024*1024 ) { // MB
                            var perc = current_importation.size / (1024*1024);
                            sizeStr = (Math.round(perc * 100) / 100)+" MB";
                        } else {
                            var perc = current_importation.size / (1024);
                            sizeStr = (Math.round(perc * 100) / 100)+" KB";
                        }

                        notifier.notify({
                            title: "Iniciando Importação",
                            message: "Iniciando importação de '"+current_importation.root_name+"', com "+sizeStr+".",
                            wait: true
                        });

                        win.webContents.executeJavaScript("createImportationNotification('"+current_importation.root_name+"', "+perc+")");

                    } else if ( messageObj.op === "notifyImportedSize" ) {

                        total_imported_size = total_imported_size+messageObj.size;

                        var perc = (total_imported_size*1.0/current_importation.size);

                        win.setProgressBar(perc);

                        perc = Math.round(perc * 10000) / 100;

                        console.log("Vai chamar updateImportationNotification!");
                        console.log("updateImportationNotification('"+current_importation.root_name+"', "+perc+")");
                        win.webContents.executeJavaScript("updateImportationNotification('"+current_importation.root_name+"', "+perc+")");

                        global.ipc.emit('message', JSON.stringify({"op": "getAllMetadata"}));

                    } else if ( messageObj.op === "notifyImportationConcluded" ) {

                        win.setProgressBar(-1);

                        notifier.notify({
                            title: "Importação Concluída",
                            message: "A importação de '"+current_importation.root_name+"' foi concluída com sucesso!"
                        });

                        //win.webContents.executeJavaScript("showImportationNotification('"+current_importation.root_name+"', 0)");

                        win.webContents.executeJavaScript("notifyImportationConcluded('"+current_importation.root_name+"', "+perc+")");

                    } else if ( messageObj.op === "openFile" ) {

                        shell.openItem(messageObj.path);

                    } else if ( messageObj.op === "returnCheckForCredentials" ) {
                        
                        var status = messageObj.status;
                        console.log("credentials status: "+status);

                        if ( !status ) {

                            var words = rword.generate(6);

                            var wordsStr = "";
                            for (var i = 0; i < words.length; i++) {
                                if ( i === 0 ) {
                                    wordsStr = wordsStr + words[i];
                                } else {
                                    wordsStr = wordsStr + " " + words[i];
                                }
                            }

                            win.webContents.executeJavaScript("createCredential('"+wordsStr+"')");

                        } else {

                            // Show login
                            win.webContents.executeJavaScript("checkCredentials()");

                        }

                    } else if ( messageObj.op === "returnIsLoggedIn" ) {

                        if ( !messageObj.status ) {
                            global.ipc.emit('message', JSON.stringify({"op": "checkForCredentials"}));
                        } else {
                            global.ipc.emit('message', JSON.stringify({"op": "getAllMetadata"}));
                        }
                        
                    } else if ( messageObj.op === "returnGetSwarmsList" ) {

                        win.webContents.executeJavaScript("returnSwarmsList('"+JSON.stringify(messageObj.swarms)+"')");

                    } else if ( messageObj.op === "returnGetConfigs" ) {

                        win.webContents.executeJavaScript("returnGetConfigs('"+JSON.stringify(messageObj.configs)+"')");

                    } else if ( messageObj.op === "returnAddSwarmPair" ) {

                        global.ipc.emit('message', JSON.stringify({"op": "getSwarmsList"}));

                    } else if ( messageObj.op === "notifyCreateRootDirectoryConcluded" ) {

                        global.ipc.emit('message', JSON.stringify({"op": "getAllMetadata"}));

                    } else if ( messageObj.op === "returnGetGateway" ) {

                        win.webContents.executeJavaScript("returnGetGateway('"+messageObj.gateway+"')");

                    } else if ( messageObj.op === "returnShareRoot" ) {

                        var complete_path = messageObj.complete_path;
                        var passphrase = messageObj.passphrase;

                        const options = {
                            title: 'Selecione onde salvar o arquivo de convite.',
                            properties: ['openDirectory']
                        };

                        dialog.showOpenDialog(null, options, (foldersPaths) => {

                            if ( typeof foldersPaths !== "undefined" ) {
                                
                                foldersPaths = foldersPaths[0];

                                var file_name = path.basename(complete_path);
                                fs.copyFile(complete_path, path.join(foldersPaths, file_name), (err) => {

                                    if (err) throw err;

                                    win.webContents.executeJavaScript("showSharePassword('"+passphrase+"')");

                                });

                            }
                        });
                        
                    }

                }
            );

            ipc.of.IPFSSyncroService.on(
                'error',
                function (data) {
                    ipc.log('error message: '.debug, data);
                }
            );

        }
    );

}