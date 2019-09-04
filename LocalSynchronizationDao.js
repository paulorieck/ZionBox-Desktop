const devnull = require('dev-null');
const ipfs = require('./ipfs');
const zionbox_desktop = require('./zionbox-desktop');

const os = require('os');
const path = require('path');
const prettybytes = require('pretty-bytes');

var db_syncronization = path.join(os.homedir(), ".zionbox-service", "nedbs", "syncronization.db");
var db_to_synchronize = path.join(os.homedir(), ".zionbox-service", "nedbs", "to_synchronize.db");

const Datastore = require('nedb');
const synchronization_db = new Datastore({filename: db_syncronization, autoload: true});
const to_synchronize_db = new Datastore({filename: db_to_synchronize, autoload: true});

var synchronization_counter = 0;

function searchObjectOnMetadataStructure(metadata_, metadata_hash) {

    var metadata_temp = null;
    for (var i = 0; i < metadata_.length; i++) {

        if ( metadata_[i].metadata_hash === metadata_hash ) {
            metadata_temp = metadata_[i];
        }

        if ( metadata_temp === null || typeof metadata_temp === "undefined" ) {

            var processed_child = metadata_[i].processed_child;

            if ( processed_child.length > 0 ) {

                metadata_temp = searchObjectOnMetadataStructure(processed_child, metadata_hash);

                if ( metadata_temp !== null && typeof metadata_temp !== "undefined" ) {
                    return metadata_temp;
                }

            } else if ( metadata_temp !== null && typeof metadata_temp !== "undefined" ) {
                return metadata_temp;
            }

        } else {
            return metadata_temp;
        }

    }

}

function synchronizeListOfObjects(counter, list, id, metadata_, callback) {

    if ( typeof list[counter] !== "undefined" ) {

        while ( synchronization_counter <= 3 ) {

            // Syncronize object
            synchronizeObject(list[counter], id, "", function () {

                var object2Synchro = searchObjectOnMetadataStructure(metadata_, list[counter]);

                // Synchronize binary
                synchronizeObject(object2Synchro.binary_hash, id, object2Synchro.name, function () {

                    counter++;
                    synchronization_counter++;
            
                    if ( counter > list.length ) {
                        callback();
                    } else {
                        synchronizeListOfObjects(counter, list, id, metadata_, function () {
                            synchronization_counter--;
                            callback();
                        });
                    }
            
                });

            });

        }

    }

}

function synchronizeObject(hash, id, name, callback) {

    console.log("Synchronizing locally object: "+hash);

    // Cat content
    var readableStream = ipfs.synchronizeObject(hash);
    ipfs.getFileStat(hash, function (stats) {

        var total_size = stats.CumulativeSize;

        var downloaded = 0;
        readableStream.on('data', function(chunk) {

            downloaded += chunk.length;

            if ( name !== "" ) {
                zionbox_desktop.updateDownloadProgress(name, total_size, downloaded);
            }
            
        });

        readableStream.pipe(devnull());

        readableStream.on('end',function () {
            
            // Saves information on db
            localSynchronizationDao.registerSynchronized(hash, id, function () {
                callback();
            });

        });

    });

}

function searchObjectOnMetadataStructure(metadata_, metadata_hash) {

    var metadata_temp = null;
    for (var i = 0; i < metadata_.length; i++) {

        if ( metadata_[i].metadata_hash === metadata_hash ) {
            metadata_temp = metadata_[i];
        } else {
            var versions = metadata_[i].versions;
            for (var j = 0; j < versions.length; j++) {
                if ( versions[j].metadata_hash === metadata_hash ) {
                    metadata_temp = metadata_[i];
                    break;
                }
            }
        }

        if ( metadata_temp === null || typeof metadata_temp === "undefined" ) {

            var processed_child = metadata_[i].processed_child;

            if ( processed_child.length > 0 ) {

                metadata_temp = searchObjectOnMetadataStructure(processed_child, metadata_hash);

                if ( metadata_temp !== null && typeof metadata_temp !== "undefined" ) {
                    return metadata_temp;
                }

            } else if ( metadata_temp !== null && typeof metadata_temp !== "undefined" ) {
                return metadata_temp;
            }

        } else {
            return metadata_temp;
        }

    }

}

function getSubs(metadata, child, complete_to_synchronize_list) {

    for (var i = 0; i < metadata.length; i++) {

        child.push(metadata[i].metadata_hash);

        if ( metadata[i].type === "file" ) {

            // Get also the binary hash
            complete_to_synchronize_list.push(metadata[i].binary_hash);

        } else {

            complete_to_synchronize_list.push(metadata[i].metadata_hash);

            var processed_child = metadata[i].processed_child;
            if ( typeof processed_child !== "undefined" && processed_child.length > 0 ) {
                child = getSubs(processed_child, child, complete_to_synchronize_list);
            }

        }

    }

    return child;

}

module.exports = localSynchronizationDao = {

    registerSynchronized: function (hash, id, callback) {

        var obj = {"hash": hash, "id": id, "time": (new Date()).getTime()};
        synchronization_db.insert(obj, function (error, newDoc) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(newDoc);
        });

    },

    getAllSynchronized: function (id, callback) {

        synchronization_db.find({id: id}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            } else {
                callback(docs);
            }
        });

    },

    unregisterSynchronized: function (hash, id, callback) {

        synchronization_db.remove({hash: hash, id: id}, {}, function (err, numRemoved) {
            callback();
        });

    },

    checkSynchronized: function (hash, id, callback) {

        synchronization_db.find({hash: hash, id: id}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            } else {
                callback(docs);
            }
        });

    },

    checkToSynchronize: function (hash, id, callback) {

        to_synchronize_db.find({hash: hash, id: id}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            } else {
                callback(docs);
            }
        });

    },

    setToSynchronize: function (hash, id, callback) {

        var obj = {"hash": hash, "id": id};
        to_synchronize_db.insert(obj, function (error, newDoc) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(newDoc);
        });

    },

    getAllToSyncronize: function (id, callback) {

        to_synchronize_db.find({id: id}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            } else {
                callback(docs);
            }
        });

    },

    removeFromToSynchronize: function (hash, id, callback) {

        to_synchronize_db.remove({hash: hash, id: id}, {}, function (err, numRemoved) {
            callback();
        });

    },

    processSynchronizations: function (id, metadata) {

        var synchronization_pending_list = [];

        // Get all "to synchronize"
        localSynchronizationDao.getAllToSyncronize(id, function (to_synchronize) {

            var complete_to_synchronize_list = [];
            for (var i = 0; i < to_synchronize.length; i++) {

                console.log("Locally to_synchronize[i].hash:");
                console.log(to_synchronize[i].hash);
                console.log("");

                var to_synchronize_obj = searchObjectOnMetadataStructure(metadata, to_synchronize[i].hash);

                console.log("Locally to_synchronize_obj:");
                console.log(to_synchronize_obj);
                console.log("");

                if ( typeof to_synchronize_obj !== "undefined" ) {

                    if ( to_synchronize_obj.metadata_hash !== to_synchronize[i].hash ) {

                        // Removes the original to synchronize from db and adds the updated one
                        localSynchronizationDao.removeFromToSynchronize(to_synchronize[i].hash, id, function () {
                            localSynchronizationDao.setToSynchronize(to_synchronize_obj.metadata_hash, id, function () {});
                        });
    
                    }
    
                    complete_to_synchronize_list.push(to_synchronize_obj.metadata_hash);
    
                    if ( to_synchronize_obj.type === "folder" ) {
    
                        // Get everythin under this level of the structure
                        var sub_objects = getSubs(metadata, [], complete_to_synchronize_list);
    
                        for (var j = 0; j < sub_objects.length; j++) {
                            complete_to_synchronize_list.push(sub_objects[j]);
                        }
    
                    } else if ( to_synchronize_obj.type === "file" ) {
    
                        // Get also the binary hash
                        complete_to_synchronize_list.push(to_synchronize_obj.binary_hash);
    
                    }

                }

            }

            localSynchronizationDao.getAllSynchronized(id, function (synchronized) {

                for (var i = 0; i < complete_to_synchronize_list.length; i++) {

                    var is_syncrhonized = false;
                    for (var j = 0; j < synchronized.length; j++) {
                        if ( complete_to_synchronize_list[i] === synchronized[j].hash ) {
                            is_syncrhonized = true;
                            break;
                        }
                    }

                    if ( !is_syncrhonized ) {
                        synchronization_pending_list.push(complete_to_synchronize_list[i]);
                    }

                }

                // Now that we have a list of what to synchronize, starts the synchronization!
                synchronizeListOfObjects(0, synchronization_pending_list, id, metadata, function () {
                    console.log("Local Synchronization succeeded!");
                });

            });

        });

    }

}