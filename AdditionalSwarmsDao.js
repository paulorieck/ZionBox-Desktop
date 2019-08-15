const Datastore = require('nedb');

const os = require('os');
const path = require('path');

var db_path = path.join(os.homedir(), ".zionbox-service", "nedbs", "additional_swarms.db");

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

    list: function (callback) {

        db.find({}, function (error, docs) {
            if ( error ) {
                console.log("Error:");
                console.log(error);
            } else {
                callback(docs);
            }
        });

    },

    update: function (obj, callback) {

        db.update({_id: obj._id}, {$set: {address: obj.address}}, { multi: true }, function (err, numReplaced) {
            callback();
        });

    },

    remove: function(address, callback) {

        db.remove({address: address}, {}, function (err, numRemoved) {
            // numRemoved = 1
            callback();
        });

    }

}