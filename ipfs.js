const gpg = require('./gpg');

const fs = require('fs');
const path = require('path');
const os = require('os');
const find_process = require('find-process');

var db_path = path.join(os.homedir(), ".zionbox-service", "nedbs", "pinned.db");

const Datastore = require('nedb');
const db = new Datastore({filename: db_path, autoload: true});

var ipfs;

module.exports = {

    initialize: function (callback) {

        if ( global.confs.ipfsAPI !== "" && typeof global.confs.ipfsAPI !== "undefined" ) {

            // Check if the IPFS is running
            find_process('name', 'ipfs')
                .then(function (list) {

                    var isRunning = false;
                    for (var i = 0; i < list.length; i++) {

                        if ( list[i].name === "ipfs" || list[i].name === "ipfs.exe" || list[i].name === "IPFS Desktop" ) {
                            isRunning = true;
                        }

                    }
                    console.log("isRunning: "+isRunning);
                    
                    if ( !isRunning ) { // If not running, starts ipfs daemon

                        var child_process = require('child_process');

                        var ipfsExec;
                        if ( os.platform() === "darwin" || os.platform() === "linux" ) {

                            var cwdPath = "";
                            if ( os.platform() === "darwin" ) {
                                cwdPath = "/Users";
                            } else if ( os.platform() === "linux" ) {
                                cwdPath = "~/";
                            }

                            let bin = 'ipfs';
                            let cliArgs = ["daemon"];
                            let options = {
                                spawn: false,
                                cwd: cwdPath
                            };

                            ipfsExec = child_process.spawn(bin, cliArgs, options);

                            ipfsExec.stdout.on('data', function (logs) {
                            
                                console.log("ipfs daemon logs: "+logs);
                                if ( logs.indexOf("Daemon is ready") !== -1 ) {
    
                                    const ipfsAPI = require('ipfs-http-client');
                                    ipfs = ipfsAPI(global.confs.ipfsAPI);
    
                                    callback();
    
                                }
    
                            });

                        } else if ( os.platform() === "win32" ) {

                            ipfsExec = child_process.spawn('ipfs', ['daemon'], {'spawn': false});

                            ipfsExec.stdout.on('data', function (logs) {
                            
                                console.log("ipfs daemon logs: "+logs);
    
                                if ( logs.indexOf("Daemon is ready") !== -1 ) {
    
                                    const ipfsAPI = require('ipfs-http-client');
                                    ipfs = ipfsAPI(global.confs.ipfsAPI);
    
                                    callback();
    
                                }
    
                            });

                        }

                    } else { // If the service is running, only starts the client

                        const ipfsAPI = require('ipfs-http-client');
                        ipfs = ipfsAPI(global.confs.ipfsAPI);

                        callback();

                    }

                }, function (err) {
                    console.log(err.stack || err);
                })

        }

    },

    add: function (filepath, callback) {

        let cont = fs.readFileSync(__dirname+"/"+filepath);
        cont = new Buffer(cont);

        ipfs.add(cont, function (err, result) {

            if ( err ) {
                console.log(err);
            } else {
                fs.unlinkSync(__dirname+"/"+filepath);
                callback(result[0].hash);
            }

        });

    },

    addFile: function (filepath, callback) {

        ipfs.addFromFs(filepath, {onlyHash: true}, (err, result) => {

            var hash = result[0].hash;

            var stats = null;
            ipfs.object.stat(hash, {}, function (stats_) {
                stats = stats_;
            });

            setTimeout(function () {
                if ( stats === null ) {
                    ipfs.addFromFs(filepath, {}, (err, result) => {
                        if ( err ) {
                            console.log(err); 
                        }
                        callback(result[0].hash);
                    });
                } else {
                    callback(hash);
                }
            }, 100);

        });

    },

    pin: function (username, hash, callback) {

        ipfs.pin.add(hash, function () {

            db.insert({"username": username, "metadata_hash": hash}, function (error, newDoc) {
                if ( error ) {
                    console.log("Error:");
                    console.log(error);
                }
            });

            if ( typeof callback != "undefined" ) {
                callback();
            }

        });

    },

    unpin: function (hash, callback) {

        ipfs.pin.rm(hash, function () {

            db.remove({metadata_hash: hash}, {}, function (err, numRemoved) {
                // numRemoved = 1
            });

            if ( typeof callback != "undefined" ) {
                callback();
            }

        });

    },

    getFile: function (metadata_hash, callback) {
        
        callback(ipfs.catReadableStream(metadata_hash));

    },

    getMetadata: function (metadata_hash, passphrase, callback) {

        ipfs.cat(metadata_hash, function (err, file) {

            if (err) {
                throw err;
            }

            var encrypted = file.toString('utf8');
            var decrypted = JSON.parse(gpg.decryptString(passphrase, encrypted));

            callback(decrypted);

        });

    },

    getPinnedList: function (username, callback) {

        db.find({username: username}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(docs);
        });

    },

    getId: function (callback) {
        ipfs.id(function (err, identity) {
            callback(identity);
        });
    },

    getSwarmPeers: function (callback) {

        ipfs.swarm.peers(function (err, peerInfos) {
            if (err) {
              throw err
            }
            callback(peerInfos);
        });

    },

    swarmConnect: function (addr, callback) {

        ipfs.swarm.connect(addr, function () {
            callback();
        });

    },

    getConfig: function (callback) {

        ipfs.config.get(function (error, config) {
            if ( error ) {
                console.log(error);
            } else {
                callback(config);
            }
        })

    },

    synchronizeObject: function (hash) {

        var readableStream = ipfs.catReadableStream(hash);
        return readableStream;

    }

}