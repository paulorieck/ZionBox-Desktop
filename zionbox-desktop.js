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

    win.webContents.openDevTools();

    // and load the index.html of the app.
    win.loadFile('index.html');

}

function listenIPCMain() {

    ipcMain.on('getBinary', (event, metadata_hash) => {
        zionbox_service.getBinary(metadata_hash);
    });
    
    ipcMain.on('importLocalFolder', (event, variable) => {
    
        const options = {
            title: 'Selecione uma pasta para importar',
            properties: ['openDirectory']
        };
    
        dialog.showOpenDialog(null, options, (foldersPaths) => {
            if ( typeof foldersPaths !== "undefined" ) {
                zionbox_service.importLocalFolders(foldersPaths, function (size, root_name) {
                    notifyImportationSize(size, root_name);
                });
            }
        });
    
    });
    
    ipcMain.on('createNewCredential', (event, data) => {
        data = JSON.parse(data);
        zionbox_service.createNewCredential(data.username, data.password);
    });
    
    ipcMain.on('getSwarmsList', (event, data) => {
        zionbox_service.getSwarmsList(function (swarms) {
            win.webContents.executeJavaScript("returnSwarmsList('"+JSON.stringify(swarms)+"')");
        });
    });
    
    ipcMain.on('getConfigs', (event, data) => {
        zionbox_service.getConfigs(function (configs_) {
            win.webContents.executeJavaScript("returnGetConfigs('"+JSON.stringify(configs_)+"')");            
        });
    });
    
    ipcMain.on('addSwarmPair', (event, data) => {
        data = JSON.parse(data);
        zionbox_service.addSwarmPair(data.address, function () {
            zionbox_service.getSwarmsList(function (swarms) {
                win.webContents.executeJavaScript("returnSwarmsList('"+JSON.stringify(swarms)+"')");
            });
        });
    });
    
    ipcMain.on('rmSwarmPair', (event, data) => {
        data = JSON.parse(data);
        zionbox_service.rmSwarmPair(data.address, function () {
            zionbox_service.getSwarmsList(function (swarms) {
                win.webContents.executeJavaScript("returnSwarmsList('"+JSON.stringify(swarms)+"')");
            });
        });
    });
    
    ipcMain.on('checkCredentials', (event, data) => {
        data = JSON.parse(data);
        zionbox_service.doLogin(data.username, data.password, function (obj) {
            if ( obj.success ) {
                returnGetAllMetadata(obj.metadata);
            } else {
                win.webContents.executeJavaScript("loginFailed()");
            }
        });
    });
    
    ipcMain.on('createRootDirectory', (event, name) => {
        zionbox_service.createRootDirectory(name, function () {

        });
    });
    
    ipcMain.on('createSubdirectory', (event, obj) => {
        obj = JSON.parse(obj);
        zionbox_service.createSubdirectory(obj.name, obj.metadata_hash, function (metadata_) {
            returnGetAllMetadata(metadata_);
        });
    });
    
    ipcMain.on('addFile', (event, obj) => {
        obj = JSON.parse(obj);
        zionbox_service.addFile(obj.path, obj.metadata_hash, obj.encrypt, function (metadata_) {
            returnGetAllMetadata(metadata_);
        });
    });
    
    ipcMain.on('remove', (event, metadata_hash) => {
        zionbox_service.remove(metadata_hash, function (metadata_) {
            returnGetAllMetadata(metadata_);
        });
    });
    
    ipcMain.on('importPublicHash', (event, obj) => {
        obj = JSON.parse(obj);
        zionbox_service.importPublicHash(obj.hash, obj.parent_location_hash, obj.name, function (metadata_) {
            returnGetAllMetadata(metadata_);
        });
    });
    
    ipcMain.on('setConfigs', (event, obj) => {
        obj = JSON.parse(obj);
        zionbox_service.setConfigs(JSON.stringify({"server": obj.server, "ipfsAPI": obj.ipfsAPI, "mirrorsSwarms": obj.mirrorsSwarms, "mirrors": obj.mirrors, "relaysSwarms": obj.relaysSwarms}));
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
    
        zionbox_service.shareRoot(metadata_hash, wordsStr, function (complete_path, passphrase) {

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

        });
    
    });
    
    ipcMain.on('importShare', (event, obj) => {
        obj = JSON.parse(obj);
        zionbox_service.importShare(obj.file_path, obj.passphrase);
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

function returnGetAllMetadata(metadata_) {

    console.log("Received metadata from service.");

    metadata = metadata_;
    win.webContents.executeJavaScript("loadFiles('"+JSON.stringify(metadata)+"')");

}

function connectToIPCServer() {

    zionbox_service.isLoggedIn(function (status) {

        if ( !status ) {

            zionbox_service.checkForCredentials(function (status) {

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

            });

        } else {
            zionbox_service.getAllMetadata();
        }

    });

    zionbox_service.getGateway(function (gateway) {
        win.webContents.executeJavaScript("returnGetGateway('"+gateway+"')");
    });

}


module.exports = {

    notifyImportationSize: function (size, root_name) {

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
    
    },

    notifyImportationConcluded: function (root_name) {

        win.setProgressBar(-1);

        notifier.notify({
            title: "Importação Concluída",
            message: "A importação de '"+root_name+"' foi concluída com sucesso!"
        });

        win.webContents.executeJavaScript("notifyImportationConcluded('"+root_name+"', "+perc+")");

    },

    notifyImportedSize: function (size, root_name) {

        total_imported_size = total_imported_size+size;

        var perc = (total_imported_size*1.0/current_importation.size);

        win.setProgressBar(perc);

        perc = Math.round(perc * 10000) / 100;

        console.log("updateImportationNotification('"+root_name+"', "+perc+")");
        win.webContents.executeJavaScript("updateImportationNotification('"+root_name+"', "+perc+")");

        zionbox_service.getAllMetadata();

    },

    returnGetAllMetadata: function (metadata_) {
        returnGetAllMetadata(metadata_);
    },

    openFile: function (path) {
        shell.openItem(path);
    }

}
const zionbox_service = require('./zionbox-service');