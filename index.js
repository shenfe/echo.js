var express = require('express');
var app = express();
var port = 3883;

app.use(express.static(__dirname + '/src'));

app.get('/', function (req, res) {
    res.redirect('index.html');
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});

var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');

var binaryServer = binaryServer({
    host: '127.0.0.1',
    port: 9001
});

var recordDir = './records/';

binaryServer.on('connection', function (client) {
    var fileWriter = null;

    client.on('stream', function (stream, meta) {
        var timestamp = Date.now();
        var fileName = `${recordDir}${timestamp}.wav`;
        var fileWriter = new wav.FileWriter(fileName, {
            channels: 1,
            sampleRate: 48000,
            bitDepth: 16
        });
        stream.pipe(fileWriter);
        stream.on('end', function () {
            fileWriter.end();
            console.log('file written');
        });
    });

    client.on('close', function () {
        if (fileWriter != null) {
            fileWriter.end();
            console.log('file written');
        }
    });
});
