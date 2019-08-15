const Datastore = require('nedb');
const os = require('os');
const path = require('path');

var db_path = path.join(os.homedir(), ".zionbox-service", "nedbs", "roots.db");

const db = new Datastore({filename: db_path, autoload: true});

module.exports = {

    add: function (obj, callback) {

        db.insert(obj, function (error, newDoc) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(newDoc);
        });

    },

    update: function (obj, callback) {

        db.update({_id: obj._id}, {$set: {metadata_hash: obj.metadata_hash}}, { multi: true }, function (err, numReplaced) {
            callback();
        });

    },

    remove: function(metadata_hash, callback) {

        db.remove({metadata_hash: metadata_hash}, {}, function (err, numRemoved) {
            // numRemoved = 1
            callback();
        });

    },

    getRootByMetadataHashAndUsername: function(metadata_hash, username, callback) {

        db.find({username: username, metadata_hash: metadata_hash}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(docs);
        });

    },

    getAllByUsername: function (username, callback) {

        db.find({username: username}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(docs);
        });

    }

}