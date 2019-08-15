#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

var homedir = os.homedir();

// Import configs 
global.confs = JSON.parse(fs.readFileSync(path.join(homedir, ".zionbox-service/configs.json")));

var gpg = require('./gpg');
var ipfs = require('./ipfs');

var rootsDao = require('./RootsDao');
var credentialsDao = require('./CredentialsDao');
var synchronizationDao = require('./SynchronizationDao');
var additionalSwarmsDao = require('./AdditionalSwarmsDao');


const chalk = require('chalk');
const {generateHash} = require('random-hash');

const bcrypt = require('bcrypt');
const WebSocket = require('ws');
const watch = require('node-watch');
const axios = require('axios');

const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const {CookieJar} = require('tough-cookie');
const jar = new CookieJar();

var instance = axios.create({
    baseURL: 'http://'+global.confs.server,
    withCredentials: true,
    jar: jar
});

axiosCookieJarSupport(instance);

var ws;

var myHash = "";
var myMultiAddresses = "";
var gateway = "";

var valid_hash_list = [];

const dirTree = require('directory-tree');

var metadata = [];

var pass_charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

var currentcredentials = {};

function createRoot(name, callback) {

    var now = (new Date()).getTime();

    // Checks if a root with the same name exists
    var already_exists = false;
    for (var i = 0; i < metadata.length; i++) {
        if ( metadata[i].type === "folder" && metadata[i].subtype === "root" && metadata[i].name === name ) {
            already_exists = true;
            break;
        }
    }

    if ( !already_exists ) {

        // Generates random hash for encription
        var passphrase = generateHash({
            length: 128,
            charset: pass_charset
        });

        // Creates the IPFS object
        var rootIPFSObj = {"type": "folder", "subtype": "root", "name": name, "child": [], "versions": [], "time": (new Date()).getTime()};

        // Cryptography this newly created object
        var encrypted = gpg.encryptString(passphrase, JSON.stringify(rootIPFSObj));

        var hashed_filename = generateHash({length: 5})+".gpg";
        fs.writeFileSync(hashed_filename, encrypted);

        // Stores the IPFS Object on the interplanetary space
        ipfs.add(hashed_filename, function (location_hash) {

            for (var i = 0; i < global.confs.mirrors.length; i++) {
                axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": location_hash, "id": myHash}).then((data) => {
                }).catch(function (error) {
                    console.log(error);
                });
            }

            fs.unlink(hashed_filename, function () {});

            // Pin the new content
            ipfs.pin(currentcredentials.username, location_hash);

            var hashed_passphrase = gpg.encryptString(currentcredentials.password, passphrase).toString();

            instance.post("/register_new_topic", {"topic": location_hash, "peerId": myHash});

            var rootLocalObj = {"username": currentcredentials.username, "topic": location_hash, "metadata_hash": location_hash, "passphrase": hashed_passphrase};
            rootsDao.add(rootLocalObj, function (rootLocalObj) {

                listStructure([], function (metadata_) {

                    metadata = metadata_;
    
                    console.log("Created new IPFS root folder '"+location_hash+"'");
                    //console.log("Time to create new root: "+(new Date().getTime()-now));
    
                    callback(location_hash);
    
                });

            });

        });

    } else {
        console.log("This root name already exists");
        callback(false);
    }

}

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

function subprocessParentOnChange(new_passphrase, ipfs_parent_object, parent_metadata_hash, hashed_passphrase, topic, old_parent_metadata_hash, callback) {

    // Cryptography this newly created object
    var encrypted = gpg.encryptString(new_passphrase, JSON.stringify(ipfs_parent_object));

    var hashed_filename = generateHash({length: 5})+".gpg";
    fs.writeFileSync(hashed_filename, encrypted);

    // Saves the new subfolder
    ipfs.add(hashed_filename, function (new_location_hash) {

        for (var i = 0; i < global.confs.mirrors.length; i++) {
            axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": new_location_hash, "id": myHash}).then((data) => {
            }).catch(function (error) {
                console.log(error);
            });
        }

        // Pin the new content
        ipfs.pin(currentcredentials.username, new_location_hash);

        // Unpin the original object
        ipfs.unpin(parent_metadata_hash);

        if ( ipfs_parent_object.type === "folder" && ipfs_parent_object.subtype === "root" ) {

            instance.post("/change_metadata_hash_on_topic/", {'topic': topic, 'metadata_hash': new_location_hash, "peerId": myHash});

            // Updates the existing root
            var rootLocalObj = {"username": currentcredentials.username, "metadata_hash": new_location_hash, "passphrase": hashed_passphrase, "topic": topic};
            rootsDao.add(rootLocalObj, function () {

                // Removes the old root object from local db
                rootsDao.remove(parent_metadata_hash, function () {

                    // Saves the new root on local db
                    callback(new_location_hash);

                });

            });

        } else if ( ipfs_parent_object.type === "folder" && ipfs_parent_object.subtype === "subfolder" ) {

            processParentOnChange(new_location_hash, new_passphrase, old_parent_metadata_hash, parent_metadata_hash, function () {
                callback(new_location_hash);
            });

        } else {

            callback();

        }

    });

}

function processParentOnChange(location_hash, passphrase, parent_metadata_hash, previous_location_hash, callback) {

    // Gets the object from the parent of the last proccess hash
    var ipfs_parent_object = JSON.parse(JSON.stringify(searchObjectOnMetadataStructure(metadata, parent_metadata_hash)));

    var old_parent_metadata_hash = ipfs_parent_object.parent;

    var child = [];
    for (var i = 0; i < ipfs_parent_object.processed_child.length; i++) {
        if ( ipfs_parent_object.processed_child[i].metadata_hash !== previous_location_hash ) {
            child.push({"metadata_hash": ipfs_parent_object.processed_child[i].metadata_hash, "passphrase": ipfs_parent_object.processed_child[i].passphrase});
        }
    }
    child.push({"metadata_hash": location_hash, "passphrase": passphrase});

    if ( typeof ipfs_parent_object.versions === "undefined" || ipfs_parent_object.versions === null ) {
        ipfs_parent_object.versions = [];
    } else {
        var number_to_remove = ipfs_parent_object.versions.length - 3;
        if ( number_to_remove > 0 ) {
            for (var i = 0; i < number_to_remove; i++) {
                ipfs_parent_object.versions.splice(0,1);
            }
        }
    }
    ipfs_parent_object.versions.push({"metadata_hash": parent_metadata_hash, "time": ipfs_parent_object.time, "passphrase": ipfs_parent_object.passphrase});
    ipfs_parent_object.time = (new Date()).getTime();

    delete ipfs_parent_object.processed_child;
    ipfs_parent_object.child = child;

    delete ipfs_parent_object.synchronized;
    delete ipfs_parent_object.to_synchronize;

    var new_passphrase = "";
    if ( ipfs_parent_object.type === "folder" && ipfs_parent_object.subtype === "root" ) {

        rootsDao.getRootByMetadataHashAndUsername(parent_metadata_hash, currentcredentials.username, function (rootOriginalLocalObj) {

            rootOriginalLocalObj = rootOriginalLocalObj[0];
            new_passphrase = gpg.decryptString(currentcredentials.password+"", rootOriginalLocalObj.passphrase+"");

            subprocessParentOnChange(new_passphrase, ipfs_parent_object, parent_metadata_hash, rootOriginalLocalObj.passphrase, rootOriginalLocalObj.topic, old_parent_metadata_hash, function (callbackVAr) {
                callback(callbackVAr);
            });

        });

    } else {

        // Generates random hash for encription
        new_passphrase = generateHash({
            length: 128,
            charset: pass_charset
        }); 

        subprocessParentOnChange(new_passphrase, ipfs_parent_object, parent_metadata_hash, "", "", old_parent_metadata_hash, function (callbackVAr) {
            callback(callbackVAr);
        });
        
    }

}

function createSubFolder(parent_metadata_hash, name, callback) {

    // Generates random hash for encription
    var passphrase = generateHash({
        length: 128,
        charset: pass_charset
    });

    // Creates the new subfolder
    var newIPFSObj = {
        "type": "folder", 
        "subtype": "subfolder", 
        "name": name, 
        "child": [],
        "created_by": currentcredentials.username,
        "time": (new Date()).getTime(),
        "versions": []
    };

    // Cryptography this newly created object
    var encrypted = gpg.encryptString(passphrase, JSON.stringify(newIPFSObj));

    var hashed_filename = generateHash({length: 5})+".gpg";
    fs.writeFileSync(hashed_filename, encrypted);

    // Stores the IPFS Object on the interplanetary space
    ipfs.add(hashed_filename, function (location_hash) {

        for (var i = 0; i < global.confs.mirrors.length; i++) {
            axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": location_hash, "id": myHash}).then((data) => {
            }).catch(function (error) {
                console.log(error);
            });
        }

        // Pin the new content
        ipfs.pin(currentcredentials.username, location_hash);

        processParentOnChange(location_hash, passphrase, parent_metadata_hash, parent_metadata_hash, function (new_parent_hash) {

            listStructure([], function (metadata_) {

                metadata = metadata_;

                console.log(chalk.yellow("["+name+"]")+" Created new IPFS subfolder with name '"+name+"' and location_hash: '"+location_hash+"' and the new parent hash is: "+new_parent_hash);
                //console.log("Time to create subfolder: "+(new Date().getTime()-now));

                callback(location_hash);

            });

        });

    });

}

function loop_getMetadata(counter, childs, raw_metadata, local, processed_child_, to_synchronize, callback) {

    getMetadata(childs[counter], raw_metadata, to_synchronize, function (processed_child) {

        processed_child.parent = local.metadata_hash;
        processed_child_.push(processed_child);

        counter++;

        if ( counter < childs.length ) {

            loop_getMetadata(counter, childs, raw_metadata, local, processed_child_, to_synchronize, function (controller) {
                if ( controller ) {
                    callback(processed_child_);
                }
            });

        } else {
            callback(processed_child_);
        }

    });

};

function getMetadata(local, raw_metadata, to_synchronize, callback) {

    console.log("getMetadata of "+local.metadata_hash);

    ipfs.getMetadata(local.metadata_hash, local.passphrase, function (ipfs_metadata) {

        ipfs_metadata.metadata_hash = local.metadata_hash;
        ipfs_metadata.passphrase = local.passphrase;

        // check to synchronize, compare synchronized wit to_synchronize, download everything that is signalized to synchronization
        synchronizationDao.checkSynchronized(local.metadata_hash, myHash, function (docs_synchronized) {

            if ( docs_synchronized.length > 0 ) {
                ipfs_metadata.synchronized = true;
            } else {
                ipfs_metadata.synchronized = false;
            }

            synchronizationDao.checkToSynchronize(local.metadata_hash, myHash, function (docs_to_synchronize) {

                if ( docs_to_synchronize.length > 0 ) {
                    ipfs_metadata.to_synchronize = true;
                    to_synchronize = true;
                }

                ipfs_metadata.to_synchronize = to_synchronize;
    
                valid_hash_list.push({"hash": ipfs_metadata.metadata_hash});
                if ( ipfs_metadata.type === "file" ) {
                    valid_hash_list.push({"hash": ipfs_metadata.binary_hash, "size": ipfs_metadata.size});
                }
    
                var child = ipfs_metadata.child;
    
                var processed_child = [];
                if ( ipfs_metadata.type === "folder" && child.length > 0 ) {
    
                    loop_getMetadata(0, child, raw_metadata, local, processed_child, to_synchronize, function (processed_child) {
    
                        ipfs_metadata.processed_child = processed_child;
                        delete ipfs_metadata.child;
    
                        callback(ipfs_metadata);
    
                    });
    
                } else {
    
                    ipfs_metadata.processed_child = [];
                    delete ipfs_metadata.child;
    
                    callback(ipfs_metadata);
    
                }

            });

        });

    });

}

function loop_listStructure(counter, local, raw_metadata, callback) {

    var to_synchronize = false;
    getMetadata(local[counter], raw_metadata, to_synchronize, function (newObj) {

        valid_hash_list.push({"hash": newObj.metadata_hash});
        raw_metadata.push(newObj);

        counter++;

        if ( counter < local.length ) {

            loop_listStructure(counter, local, raw_metadata, function (raw_metadata) {
                callback(raw_metadata);
            });

        } else {
            callback(raw_metadata);
        }

    });

}

function listStructure(raw_metadata, callback) {

    valid_hash_list = [];

    rootsDao.getAllByUsername(currentcredentials.username, function (local) {

        // Decrypt passphrases
        for (var i = 0; i < local.length; i++) {
            local[i].passphrase = gpg.decryptString(currentcredentials.password+"", local[i].passphrase+"");
        }

        if ( local.length > 0 ) {

            loop_listStructure(0, local, raw_metadata, function (raw_metadata) {
                callback(raw_metadata);
            });

        } else {
            callback(raw_metadata);
        }

    });

}

function remove(metadata_hash, callback) {

    console.log("will remove "+metadata_hash);

    var metadata_obj = searchObjectOnMetadataStructure(metadata, metadata_hash);
    if ( metadata_obj.type === "folder" && metadata_obj.subtype === "root" ) {

        // Remove from the local DB
        rootsDao.remove(metadata_hash, function () {
            listStructure([], function (metadata_) {
                metadata = metadata_;
                callback();
            });
        });

    } else if ( ( metadata_obj.type === "folder" && metadata_obj.subtype === "subfolder" ) || ( metadata_obj.type === "file" ) ) {

        // Get parent and remove the informed metadata_hash
        var parent_obj = JSON.parse(JSON.stringify(searchObjectOnMetadataStructure(metadata, metadata_obj.parent)));

        var child = [];
        for (var i = 0; i < parent_obj.processed_child.length; i++) {
            if ( parent_obj.processed_child[i].metadata_hash !== metadata_hash ) {
                child.push({"metadata_hash": parent_obj.processed_child[i].metadata_hash, "passphrase": parent_obj.processed_child[i].passphrase});
            }
        }

        delete parent_obj.processed_child;
        parent_obj.child = child;

        parent_obj.versions.push({"metadata_hash": parent_obj.metadata_hash, "time": parent_obj.time, "passphrase": parent_obj.passphrase});

        var original_parent_hash = parent_obj.metadata_hash;
        var original_grandparent_hash = parent_obj.parent;

        delete parent_obj.parent;
        delete parent_obj.synchronized;
        delete parent_obj.to_synchronize;

        if ( parent_obj.subtype === 'root' ) {

            // Get the original pass
            rootsDao.getRootByMetadataHashAndUsername(parent_obj.metadata_hash, currentcredentials.username, function (rootOriginalLocalObj) {

                rootOriginalLocalObj = rootOriginalLocalObj[0];
                var new_passphrase = gpg.decryptString(currentcredentials.password+"", rootOriginalLocalObj.passphrase+"");

                // Cryptography this newly created object
                var encrypted = gpg.encryptString(new_passphrase, JSON.stringify(parent_obj));

                var hashed_filename = generateHash({length: 5})+".gpg";
                fs.writeFileSync(hashed_filename, encrypted);

                // Saves the new subfolder
                ipfs.add(hashed_filename, function (new_location_hash) {

                    // Pin the new content
                    ipfs.pin(currentcredentials.username, new_location_hash);

                    // Unpin the original object
                    ipfs.unpin(metadata_obj.parent);

                    rootOriginalLocalObj.metadata_hash = new_location_hash;

                    rootsDao.update(rootOriginalLocalObj, function() {
                        listStructure([], function (metadata_) {
                            metadata = metadata_;
                            callback();
                        });
                    });

                });

            });

        } else if ( parent_obj.subtype === 'subfolder' ) {

            var new_passphrase = generateHash({
                length: 128,
                charset: pass_charset
            });

            // Cryptography this newly created object
            var encrypted = gpg.encryptString(new_passphrase, JSON.stringify(parent_obj));

            var hashed_filename = generateHash({length: 5})+".gpg";
            fs.writeFileSync(hashed_filename, encrypted);

            // Saves the new subfolder
            ipfs.add(hashed_filename, function (new_location_hash) {

                for (var i = 0; i < global.confs.mirrors.length; i++) {
                    axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": new_location_hash, "id": myHash}).then((data) => {
                    }).catch(function (error) {
                        console.log(error);
                    });
                }

                // Pin the new content
                ipfs.pin(currentcredentials.username, new_location_hash);

                // Unpin the original object
                ipfs.unpin(metadata_obj.parent);

                processParentOnChange(new_location_hash, new_passphrase, original_grandparent_hash, original_parent_hash, function (new_parent_hash) {
                    listStructure([], function (metadata_) {
                        metadata = metadata_;                        
                        callback(new_location_hash);
                    });
                });

            });

        }

    }

}

function importPublicHash(hash, parent_location_hash, name, callback) {

    var now = (new Date()).getTime();

    var passphrase = generateHash({
        length: 128,
        charset: pass_charset
    });

    // Creates the new subfolder
    var newIPFSObj = {
        "type": "file", 
        "name": name, 
        "creation_time": now, 
        "modification_time": now,
        "time": now,
        "size": 0, 
        "binary_hash": hash,
        "md5": "",
        "created_by": currentcredentials.username,
        "encrypted": false,
        "versions": []
    };

    // Cryptography this newly created object
    var encrypted = gpg.encryptString(passphrase, JSON.stringify(newIPFSObj));

    var hashed_filename = generateHash({length: 5})+".gpg";
    fs.writeFileSync(hashed_filename, encrypted);

    // Stores the IPFS Object on the interplanetary space
    ipfs.add(hashed_filename, function (metadata_location_hash) {

        synchronizationDao.setToSynchronize(metadata_location_hash, myHash, function () {
            synchronizationDao.processSynchronizations(myHash, metadata);
        });

        for (var i = 0; i < global.confs.mirrors.length; i++) {

            // Synchronize metadata
            axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": metadata_location_hash, "id": myHash}).then((data) => {
            }).catch(function (error) {
                console.log(error);
            });

            // Synchronize binary
            /*axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": hash, "id": myHash}).then((data) => {
            }).catch(function (error) {
                console.log(error);
            });*/

        }

        // Pin the new content
        ipfs.pin(currentcredentials.username, metadata_location_hash);
        ipfs.pin(currentcredentials.username, hash);

        processParentOnChange(metadata_location_hash, passphrase, parent_location_hash, parent_location_hash, function (new_parent_hash) {
    
            listStructure([], function (metadata_) {

                metadata = metadata_;

                synchronizationDao.setToSynchronize(metadata_location_hash, myHash, function () {
                    synchronizationDao.processSynchronizations(myHash, metadata);
                });

                console.log(chalk.yellow("["+name+"]")+" Created new IPFS file with name '"+name+"' and location_hash: '"+metadata_location_hash+"' and the new parent hash is: "+new_parent_hash);
                //console.log("Time to create subfolder: "+(new Date().getTime()-now));
                
                callback(metadata_location_hash);

            });

        });

    });

}

function addFile(parent_location_hash, name, path, encrypt, old_versions, callback) {

    if ( encrypt ) {

        // Convert file on gpg file
        var passphrase_ = generateHash({
            length: 128,
            charset: pass_charset
        });

        gpg.encryptFile(path, name+".enc", passphrase_, function () {

            // Save the file on IPFS
            ipfs.addFile(name+".enc", function (file_location_hash) {
    
                console.log("File '"+name+"' added with location hash: "+file_location_hash);
    
                ipfs.pin(currentcredentials.username, file_location_hash);
    
                fs.unlink(name+".enc", function () {});
    
                const stats = fs.statSync(path);

                var modification_time = stats.mtimeMs;
                var creation_time = stats.ctimeMs;
                var size = stats.size;

                // Creates the new subfolder
                var newIPFSObj = {
                    "type": "file", 
                    "name": name, 
                    "creation_time": creation_time, 
                    "modification_time": modification_time, 
                    "size": size,
                    "binary_hash": file_location_hash, 
                    "binary_passphrase": passphrase_, 
                    "created_by": currentcredentials.username,
                    "encrypted": encrypt,
                    "versions": old_versions,
                    "time": (new Date()).getTime()
                };

                // Generates random hash for encription
                var passphrase = generateHash({
                    length: 128,
                    charset: pass_charset
                });

                // Cryptography this newly created object
                var encrypted = gpg.encryptString(passphrase, JSON.stringify(newIPFSObj));

                var hashed_filename = generateHash({length: 5})+".gpg";
                fs.writeFileSync(hashed_filename, encrypted);

                // Stores the IPFS Object on the interplanetary space
                ipfs.add(hashed_filename, function (metadata_location_hash) {

                    for (var i = 0; i < global.confs.mirrors.length; i++) {

                        // Tells the mirror server to synchronize the metadata
                        axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": metadata_location_hash, "id": myHash}).then((data) => {
                        }).catch(function (error) {
                            console.log(error);
                        });

                        // Tells the mirror server to synchronize the binary
                        axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": file_location_hash, "id": myHash}).then((data) => {
                        }).catch(function (error) {
                            console.log(error);
                        });

                    }

                    // Pin the new content
                    ipfs.pin(currentcredentials.username, metadata_location_hash);

                    processParentOnChange(metadata_location_hash, passphrase, parent_location_hash, parent_location_hash, function (new_parent_hash) {

                        listStructure([], function (metadata_) {

                            metadata = metadata_;

                            console.log(chalk.yellow("["+name+"]")+" Created new IPFS file with name '"+name+"' and location_hash: '"+metadata_location_hash+"' and the new parent hash is: "+new_parent_hash);

                            callback(metadata_location_hash);

                        });

                    });

                });
    
            });
    
        });

    } else {

        // Save the file on IPFS
        ipfs.addFile(path, function (file_location_hash) {

            console.log("File '"+name+"' added with location hash: "+file_location_hash);
    
            ipfs.pin(currentcredentials.username, file_location_hash);
    
            // Generates random hash for encription
            var passphrase = generateHash({
                length: 128,
                charset: pass_charset
            });

            const stats = fs.statSync(path);
            var modification_time = stats.mtime;
            var creation_time = stats.ctime;
            var size = stats.size;

            // Creates the new subfolder
            var newIPFSObj = {
                "type": "file",
                "name": name,
                "creation_time": creation_time,
                "modification_time": modification_time,
                "size": size,
                "binary_hash": file_location_hash,
                "created_by": currentcredentials.username,
                "encrypted": encrypt,
                "versions": [],
                "time": (new Date()).getTime
            };

            // Cryptography this newly created object
            var encrypted = gpg.encryptString(passphrase, JSON.stringify(newIPFSObj));

            var hashed_filename = generateHash({length: 5})+".gpg";
            fs.writeFileSync(hashed_filename, encrypted);

            // Stores the IPFS Object on the interplanetary space
            ipfs.add(hashed_filename, function (metadata_location_hash) {

                for (var i = 0; i < global.confs.mirrors.length; i++) {

                    // Tells the mirror server to synchronize the metadata
                    axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": metadata_location_hash, "id": myHash}).then((data) => {
                    }).catch(function (error) {
                        console.log(error);
                    });

                    // Tells the mirror server to synchronize the binary
                    axios.post("http://"+global.confs.mirrors[i]+"/synchronizeObject", {"hash": file_location_hash, "id": myHash}).then((data) => {
                    }).catch(function (error) {
                        console.log(error);
                    });

                }

                // Pin the new content
                ipfs.pin(currentcredentials.username, metadata_location_hash);

                processParentOnChange(metadata_location_hash, passphrase, parent_location_hash, parent_location_hash, function (new_parent_hash) {

                    listStructure([], function (metadata_) {

                        metadata = metadata_;

                        console.log(chalk.yellow("["+name+"]")+" Created new IPFS file with name '"+name+"' and location_hash: '"+metadata_location_hash+"' and the new parent hash is: "+new_parent_hash);
                        //console.log("Time to create subfolder: "+(new Date().getTime()-now));

                        callback(metadata_location_hash);

                    });

                });

            });

        });

    }

};

function loop_importStructure(counter, structure, parent_location_hash, root_name, encrypt, callback) {

    if ( structure.length > 0 && counter < structure.length ) {

        if ( structure[counter].type === "directory" ) {

            //console.log("Will start the creation of subfolder '"+structure[counter].name+"'");

            createSubFolder(parent_location_hash, structure[counter].name, function (location_hash) {

                if ( typeof structure[counter].children !== "undefined" && structure[counter].children.length > 0 ) {

                    // Process structure down
                    loop_importStructure(0, structure[counter].children, location_hash, root_name, encrypt, function (location_hash_) {

                        counter++;

                        parent_location_hash = searchObjectOnMetadataStructure(metadata, location_hash_).parent;

                        // Process structure laterally
                        loop_importStructure(counter, structure, parent_location_hash, root_name, encrypt, function (location_hash_) {
                            callback(location_hash_);
                        });

                    });

                } else {

                    counter++;

                    parent_location_hash = searchObjectOnMetadataStructure(metadata, location_hash).parent;

                    // Process structure laterally
                    loop_importStructure(counter, structure, parent_location_hash, root_name, encrypt, function (location_hash_) {
                        callback(location_hash_);
                    });

                }

            });

        } else if ( structure[counter].type === "file" ) {

            if ( structure[counter].name !== ".DS_Store" ) {

                addFile(parent_location_hash, structure[counter].name, structure[counter].path, encrypt, [], function (location_hash) {

                    zionbox_desktop.notifyImportationSize(structure[counter].size, root_name);

                    counter++;

                    parent_location_hash = searchObjectOnMetadataStructure(metadata, location_hash).parent;
    
                    // Process structure laterally
                    loop_importStructure(counter, structure, parent_location_hash, root_name, encrypt, function (location_hash_) {
                        callback(location_hash_);
                    });
    
                });

            } else {

                counter++;
    
                // Process structure laterally
                loop_importStructure(counter, structure, parent_location_hash, root_name, encrypt, function (location_hash_) {
                    callback(location_hash_);
                });

            }

        }

    } else {

        // Go back upwards on structure
        callback(parent_location_hash);

    }

}

function computeImportationSize(counter, structure, sum, callback) {

    if ( structure.length > 0 && counter < structure.length ) {

        if ( structure[counter].type === "directory" ) {

            if ( typeof structure[counter].children !== "undefined" && structure[counter].children.length > 0 ) {

                // Process structure down
                computeImportationSize(0, structure[counter].children, sum, function (sum_) {

                    counter++;

                    // Process structure laterally
                    computeImportationSize(counter, structure, sum_, function (sum_) {
                        callback(sum_);
                    });

                });

            } else {

                counter++;

                // Process structure laterally
                computeImportationSize(counter, structure, sum, function (sum_) {
                    callback(sum_);
                });

            }

        } else if ( structure[counter].type === "file" ) {

            if ( structure[counter].name !== ".DS_Store" ) {

                var stats = fs.statSync(structure[counter].path);
                sum = sum + stats.size;

                counter++;

                // Process structure laterally
                computeImportationSize(counter, structure, sum, function (sum_) {
                    callback(sum_);
                });

            } else {

                counter++;
    
                // Process structure laterally
                computeImportationSize(counter, structure, sum, function (sum_) {
                    callback(sum_);
                });

            }

        }

    } else {

        // Go back upwards on structure
        callback(sum);

    }

}

function importStructure(dir_path, root_name, encrypt, callback) {

    console.log("Import Structure: "+dir_path);

    // Creates the root folder
    createRoot(root_name, function (root_location_hash) {

        if ( root_location_hash ) {

            // Get the structure
            var original_structure = dirTree(dir_path).children;

            computeImportationSize(0, original_structure, 0, function (computedSize) {

                console.log("Total importation size: "+computedSize+" bytes.");

                zionbox_desktop.notifyImportationSize(computedSize, root_name);

                loop_importStructure(0, original_structure, root_location_hash, root_name, encrypt, function () {

                    zionbox_desktop.notifyImportationSize(root_name);
                    synchronizationDao.processSynchronizations(myHash, metadata);

                    callback();

                });

            });

        } else {
            callback();
        }

    });

}

function processMetadata(callback) {

    // Start to process the original structure
    var now = (new Date()).getTime();
    listStructure([], function (metadata_) {

        metadata = metadata_;
        callback(metadata);

        synchronizationDao.processSynchronizations(myHash, metadata);

        console.log("Time to process metadata: "+((new Date()).getTime()-now)+" ms");

        ipfs.getPinnedList(currentcredentials.username, function (pinned_list) {

            // Process hashes to pin
            for (var i = 0; i < valid_hash_list.length; i++) {
                
                var exists = false;
                for (var j = 0; j < pinned_list.length; j++) {
                    if ( valid_hash_list[i].hash === pinned_list[j].metadata_hash ) {
                        exists = true;
                        break;
                    }
                }

                if ( !exists ) {
                    ipfs.pin(currentcredentials.username, valid_hash_list[i].hash);
                }

            }

            // Process hashes to unpin
            for (var i = 0; i < pinned_list.length; i++) {

                var exists = false;
                for (var j = 0; j < valid_hash_list.length; j++) {
                    if ( pinned_list[i].metadata_hash === valid_hash_list[j].hash ) {
                        exists = true;
                        break;
                    }
                }

                if ( !exists ) {
                    ipfs.unpin(pinned_list[i].metadata_hash);
                }

            }        

        });

        //////// Send hashes to mirrors
        for (var i = 0; i < global.confs.mirrors.length; i++) {
            axios.post("http://"+global.confs.mirrors[i]+"/processStructure", {"hashes": valid_hash_list, "id": myHash}).then((data) => {
            }).catch(function (error) {
                console.log(error);
            });
        }

    });

}

function main() {

    // Remove temporary files from old sessions
    fs.readdir(path.join(homedir, ".zionbox-service/temp_files"), (err, files) => {

        if (err) throw err;
      
        for (const file of files) {
            fs.unlink(path.join(path.join(homedir, ".zionbox-service/temp_files"), file), err => {
                if (err) throw err;
            });
        }

    });

    fs.readdir(path.join(homedir, ".zionbox-service/exported_files"), (err, files) => {

        if (err) throw err;
      
        for (const file of files) {
            fs.unlink(path.join(path.join(homedir, ".zionbox-service/exported_files"), file), err => {
                if (err) throw err;
            });
        }

    });

    ipfs.initialize(function () {

        ipfs.getId(function (identity) {

            ipfs.getConfig(function (config) {

                gateway = config.Addresses.Gateway;

                (async () => {
    
                    myHash = identity.id;
                    myMultiAddresses = identity.addresses;

                    // Connect to the communication server
                    ws = new WebSocket('ws://'+global.confs.server+'/');
                    
                    ws.on('open', function open() {
                        console.log('WebSocket connection opened.');
                        ws.send(JSON.stringify({'op': 'register_client', 'peerId': myHash, 'multi_addresses': myMultiAddresses}));
                    });
                    
                    ws.on('message', function incoming(data) {
        
                        data = JSON.parse(data);
        
                        console.log("received message: ");
                        console.log(data);
        
                        if ( data.op === 'notify_changed_metadata_hash' ) { // KEEP AS WS CONNECTION!
        
                            // Updates the local root topic
                            rootsDao.getRootByMetadataHashAndUsername(currentcredentials.username, data.old_metadata_hash, function (rootObj) {
        
                                rootObj = rootObj[0];
                                rootObj.metadata_hash = new_metadata_hash;
        
                                rootsDao.update(rootObj, function () {
                                    listStructure([], function (metadata_) {
                                        metadata = metadata_;
                                        zionbox_desktop.returnGetAllMetadata(metadata)
                                    });
                                });
        
                            });
        
                        } else if ( data.op === 'inform_new_login' ) { // KEEP AS WS CONNECTION!
        
                            for (var i = 0; i < data.login_multi_addresses.length; i++) {
                                ipfs.swarmConnect(data.login_multi_addresses[i], function () { 
                                    console.log("Connected to another peer through swarm with address "+data.login_multi_addresses[i]);
                                });
                            }
        
                        }
        
                    });
        
                    // Connect to mirrorsSwarms
                    ipfs.swarmConnect(global.confs.mirrorsSwarms, function () {
                        console.log("Connected to mirror swarm");
                    });
        
                    // Connect to relaysSwarms
                    ipfs.swarmConnect(global.confs.relaysSwarms, function () {
                        console.log("Connected to relay swarm");
                    });
    
                    additionalSwarmsDao.list(function (swarms) {
    
                        for (var i = 0; i < swarms.length; i++) {
                            ipfs.swarmConnect(swarms[i].address, function () {});
                        }
    
                    });
        
                })();

            });

        });

    });

}

const npmAutoUpdate = new (require('npm-auto-update'))(console);
npmAutoUpdate.checkForUpdate((error, result) => {

    if ( result ) {

        console.log("Updating ZionBox-Service");

        npmAutoUpdate.updatePackage((error, result) => {

            main();

        });

    } else {

        main();

    }
    
});

zionbox_service = module.exports = {

    getBinary: function (metadata_hash) {

        console.log("Will get binary from metadata hash: "+metadata_hash);

        var metadata_obj = searchObjectOnMetadataStructure(metadata, metadata_hash);
        var binary_hash = metadata_obj.binary_hash;
        var encrypt = metadata_obj.encrypted;

        ipfs.getFile(binary_hash, function (stream) {

            var file_temp_path = path.join(homedir, ".zionbox-service/temp_files/"+metadata_obj.name);
            var writestream = fs.createWriteStream(file_temp_path+".enc");

            stream.pipe(writestream);
            stream.on('end',function () {

                // If file is encrypted...
                /*if ( encrypted ) {*/

                    // Decrypt file
                    gpg.decryptFile(file_temp_path+".enc", file_temp_path, metadata_obj.binary_passphrase, function () {

                        // Define the ctime and mtime according to the registers on metadata
                        fs.utimesSync(file_temp_path, Math.floor(metadata_obj.modification_time/1000), Math.floor(metadata_obj.modification_time/1000));

                        // Tells electron about the downloaded content
                        zionbox_desktop.openFile(path);

                        watch(file_temp_path, { recursive: true }, (event, filename) => {

                            if (filename) {

                                // Checks if the mdate has changed
                                var stats = fs.statSync(file_temp_path);
                                var new_modification_time = stats.mtimeMs;

                                if ( new_modification_time !== metadata_obj.modification_time ) {

                                    console.log(`${filename} file Changed`);

                                    var old_version_obj = searchObjectOnMetadataStructure(metadata, metadata_hash);
                                    var old_versions = old_version_obj.versions;
                                    
                                    old_versions.push({"metadata_hash":metadata_hash, "time": (new Date()).getTime(), "passphrase": old_version_obj.passphrase});

                                    remove(metadata_hash, function (new_parent_hash) {

                                        console.log(`Removed old file ${filename}`);

                                        addFile(new_parent_hash, path.basename(filename), file_temp_path, encrypt, old_versions, function () {

                                            console.log(`Added new file ${filename}`);

                                            listStructure([], function (metadata_) {
                                                metadata = metadata_;
                                            });

                                        });

                                    });

                                }

                            }

                        });

                    });

                /*} else {
                }*/

            });

        });

    },

    importLocalFolders: function (foldersPaths) {

        var encrypt = true;
        for (var i = 0; i < foldersPaths.length; i++) {
            importStructure(foldersPaths[i], path.basename(foldersPaths[i]), encrypt, function () {});
        }

    },

    createNewCredential: function (username, password) {

        var newCredential = {"username": username, "hash": bcrypt.hashSync(password, 10)};

        credentialsDao.add(newCredential, function () {
            zionbox_service.doLogin(username, password);
        });

    },

    getSwarmsList: function (callback) {

        additionalSwarmsDao.list(function (swarms) {
            callback(swarms);
        });

    },

    getConfigs: function (callback) {
        callback(confs);
    },

    addSwarmPair: function (address, callback) {

        additionalSwarmsDao.add({"address": address}, function (newObj) {
            ipfs.swarmConnect(messageObj.address, function () {});
            callback();
        });

    },

    rmSwarmPair: function (address, callback) {

        additionalSwarmsDao.remove(address, function () {
            callback();
        });

    },

    doLogin: function (username, password, callback) {

        credentialsDao.getCredentialByUsername(username, function (credential) {

            credential = credential[0];
    
            // Check hash
            bcrypt.compare(password, credential.hash, function(err, isLoggedIn) {
    
                console.log("Login successfull? "+isLoggedIn);
                if ( isLoggedIn ) {
    
                    currentcredentials.username = username;
                    currentcredentials.password = password;
    
                    ////////////////////////
                    rootsDao.getAllByUsername(currentcredentials.username, function (roots) {
    
                        var topics_ids = [];
                        for (var i = 0; i < roots.length; i++) {
                            topics_ids.push(roots[i].topic);
                        }
    
                        instance.post("/get_topics", {"peerId": myHash.id, "login_multi_addresses": myMultiAddresses, "topics_ids": topics_ids}).then((data) => {
    
                            data = data.data;
    
                            // Check topics
                            var remote_topics = data.topics;
                            rootsDao.getAllByUsername(currentcredentials.username, function (local_topics) {
                                
                                // Compare local and remote topics
                                for (var i = 0; i < local_topics.length; i++) {
                                    for (var j = 0; j < remote_topics.length; j++) {
                                        if ( local_topics[i].topic === remote_topics[j].topic ) {
    
                                            if ( local_topics[i].metadata_hash !== remote_topics[j].metadata_hash ) {
                                                local_topics[i].metadata_hash = remote_topics[j].metadata_hash;
                                                rootsDao.update(local_topics[i], function() {});
                                            }
    
                                        }
                                    }
                                }
    
                            });
    
                            // Pair swarm multi addresses
                            var multi_address = data.multi_addresses;
                            for (var i = 0; i < multi_address.length; i++) {
                                for (var j = 0; j < multi_address[i].length; j++) {
    
                                    var address = multi_address[i][j];
    
                                    console.log("Connecting to another peer through swarm with address "+address);
                                    ipfs.swarmConnect(address, function () {});
    
                                }
                            }
    
                        });
    
                    });
                    ////////////////////////
    
                    processMetadata(function () {
                        callback(metadata);
                    });
    
                } else {
                    currentcredentials = {};
                }
    
            });
    
        });

    },

    createRootDirectory: function (name, callback) {

        createRoot(name, function () {
            callback(metadata);
        });

    },

    createSubdirectory: function (name, metadata_hash, callback) {

        createSubFolder(metadata_hash, name, function (location_hash) {
            callback(metadata);
        });

    },

    addFile: function (path, metadata_hash, encrypt, callback) {

        var filename = path.replace(/^.*[\\\/]/, '')
        addFile(metadata_hash, filename, encrypt, [], function () {
            callback(metadata);
        });

    },

    remove: function (metadata_hash, callback) {

        remove(metadata_hash, function () {
            callback(metadata);
        });

    },

    importPublicHash: function (hash, parent_location_hash, name, callback) {

        importPublicHash(hash, parent_location_hash, name, function () {
            callback(metadata);
        });

    },

    setConfigs: function (data) {

        confs = data;
        fs.writeFileSync(path.join(homedir, ".zionbox-service/configs.json"), JSON.stringify(data));

    },

    shareRoot: function (metadata_hash, passphrase, callback) {

        var metadata_obj = searchObjectOnMetadataStructure(metadata, metadata_hash);

        rootsDao.getRootByMetadataHashAndUsername(metadata_hash, currentcredentials.username, function (rootObj) {

            rootObj = rootObj[0];
            rootObj.passphrase = gpg.decryptString(currentcredentials.password+"", rootObj.passphrase+"");

            delete rootObj.username;
            delete rootObj._id;
            delete rootObj.metadata_hash;

            var hashed_filename = metadata_obj.name+".ips";
            var complete_path = path.join(homedir, ".zionbox-service/exported_files", hashed_filename);

            fs.writeFileSync(complete_path+".temp", JSON.stringify(rootObj));
            gpg.encryptFile(complete_path+".temp", complete_path, passphrase, function () {
                callback(complete_path, passphrase);
            });

        });

    },

    importShare: function (input, passphrase) {

        var file_name = path.basename(input).replace(".ips", ".json");

        var output = path.join(homedir, ".zionbox-service/temp_files", file_name);

        gpg.decryptFile(input, output, passphrase, function () {

            var imported_data = JSON.parse(fs.readFileSync(output));

            // Subscribe to topic on server
            instance.post("add_peer_to_topic", {'peerId': myHash, 'topic': imported_data.topic, 'login_multi_addresses': myMultiAddresses}).then((data) => {

                data = data.data;

                var metadata_hash = data.metadata_hash;

                // Register the new root on the local db
                var encoded_passphrase = gpg.encryptString(currentcredentials.password+"", imported_data.passphrase+"");
                rootsDao.add({"topic": imported_data.topic, "metadata_hash": metadata_hash, "passphrase": encoded_passphrase, "username": currentcredentials.username}, function () {

                    // Process metadata again
                    listStructure([], function (metadata_) {
                        metadata = metadata_;
                        zionbox_desktop.returnGetAllMetadata(metadata);
                    });

                });

                // Connect swarm to new connections
                for (var i = 0; i < data.login_multi_addresses.length; i++) {
                    ipfs.swarmConnect(data.login_multi_addresses[i], function () {
                        console.log("Connected to another peer through swarm with address "+data.login_multi_addresses[i]);
                    });
                }
                
            });

        });

    },

    getAllMetadata: function (callback) {
        callback(metadata);
    },

    checkForCredentials: function (callback) {

        credentialsDao.getAll(function (credentials) {

            if ( credentials.length > 0 ) {
                callback(true);
            } else {
                callback(false);
            }

        });

    },

    getGateway: function (callback) {
        callback(gateway);
    },

    isLoggedIn: function (callback) {

        var isLoggedIn = false;
        if ( typeof currentcredentials.username !== "undefined" ) {
            isLoggedIn = true;
        }

        if ( isLoggedIn ) {
            
            processMetadata(function () {
                callback(isLoggedIn, currentcredentials.username);
            });

        } else {

            callback(isLoggedIn, currentcredentials.username);

        }

    }

}