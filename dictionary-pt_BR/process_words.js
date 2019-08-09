const readline = require('readline');  
const fs = require('fs');

var words = [];

var files = [
    "pt-words-A.txt", "pt-words-B.txt", "pt-words-C.txt", "pt-words-D.txt", "pt-words-E.txt", "pt-words-F.txt", "pt-words-G.txt", 
    "pt-words-H.txt", "pt-words-I.txt", "pt-words-J.txt", "pt-words-K.txt", "pt-words-L.txt", "pt-words-M.txt", "pt-words-N.txt",
    "pt-words-O.txt", "pt-words-P.txt", "pt-words-Q.txt", "pt-words-R.txt", "pt-words-S.txt", "pt-words-T.txt", "pt-words-U.txt",
    "pt-words-V.txt", "pt-words-W.txt", "pt-words-X.txt", "pt-words-Y.txt", "pt-words-Z.txt"]

function readFile(counter, callback) {

    console.log("counter: "+counter);

    const readInterface = readline.createInterface({  
        input: fs.createReadStream(files[counter]),
        output: process.stdout,
        console: false
    });

    readInterface.on('line', function(line) {  
        
        console.log(line);
        words.push(line);

    });

    readInterface.on('close', function(line) {

        console.log("File processing ending!");

        counter++;

        if ( counter < files.length ) {
            readFile(counter, function () {
                callback();
            });
        } else {
            callback();
        }
        
    });

}

readFile(0, function () {
    fs.writeFileSync('pt_BR-small.json', JSON.stringify(words));
});