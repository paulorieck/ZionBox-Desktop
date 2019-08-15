const Datastore = require('nedb');
const os = require('os');
const path = require('path');

var db_path = path.join(os.homedir(), ".zionbox-service", "nedbs", "credentials.db");

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

    remove: function(username, callback) {

        db.remove({username: username}, {}, function (err, numRemoved) {
            // numRemoved = 1
            callback();
        });

    },

    getCredentialByUsername: function (username, callback) {

        db.find({username: username}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(docs);
        });

    },

    getAll: function (callback) {

        db.find({}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            }
            callback(docs);
        });

    }

}