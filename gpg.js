const crypto = require('crypto');
const fs = require('fs');

gpg = module.exports = {

    encryptString: function (passphrase, inpuStr) {

        var cipher = crypto.createCipher('aes-256-cbc', passphrase)
        var crypted = cipher.update(inpuStr, 'utf8', 'hex')
        crypted += cipher.final('hex');

        return crypted;
        
    },

    decryptString: function (passphrase, inpuString) {

        var decipher = crypto.createDecipher('aes-256-cbc', passphrase)
        var dec = decipher.update(inpuString, 'hex', 'utf8')
        dec += decipher.final('utf8');

        return dec;

    },

    encryptFile: function (input, output, passphrase, callback) {

        var r = fs.createReadStream(input);
        var encrypt = crypto.createCipher('aes-256-cbc', passphrase);
        var w = fs.createWriteStream(output);

        r.pipe(encrypt).pipe(w).on('finish', function () {
            callback();
        });

    },

    decryptFile: function (input, output, passphrase, callback) {

        var r = fs.createReadStream(input);
        var decrypt = crypto.createDecipher('aes-256-cbc', passphrase);
        var w = fs.createWriteStream(output);

        r.pipe(decrypt).pipe(w).on('finish', function () {
            callback();
        });
        
    }

}