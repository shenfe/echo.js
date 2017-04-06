var express = require('express');
var app = express();
var port = 3883;

app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/records'));

app.get('/', function (req, res) {
    res.redirect('index.html');
});

var server = app.listen(port, function () {
    console.log('Listening on port %d', server.address().port);
});

var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');

var sox = require('sox');

var tempDir = './records/tmp/';
var recordDir = './records/';

var soxTaskExec = function (fileName) {
    var job = sox.transcode(tempDir + fileName, recordDir + fileName, {
        sampleRate: 16000,
        format: 'wav',
        channelCount: 1,
        bitRate: 192 * 1024,
        compressionQuality: 5, // see `man soxformat` search for '-C' for more info
    });
    job.on('error', function (err) {
        console.error(err);
    });
    job.on('progress', function (amountDone, amountTotal) {
        console.log("progress", amountDone, amountTotal);
    });
    job.on('src', function (info) {
        /* info looks like:
        {
            format: 'wav',
            duration: 1.5,
            sampleCount: 66150,
            channelCount: 1,
            bitRate: 722944,
            sampleRate: 44100,
        }
        */
    });
    job.on('dest', function (info) {
        /* info looks like:
        {
            sampleRate: 44100,
            format: 'mp3',
            channelCount: 2,
            sampleCount: 67958,
            duration: 1.540998,
            bitRate: 196608,
        }
        */
    });
    job.on('end', function () {
        console.log('complete resampling file ' + fileName);
    });
    job.start();
};

var binaryServer = binaryServer({
    host: '127.0.0.1',
    port: 9001
});

var processWavFile = function (fileName) {
    soxTaskExec(fileName);
};

binaryServer.on('connection', function (client) {
    var fileWriter = null;

    client.on('stream', function (stream, meta) {
        var timestamp = Date.now();
        var fileName = `${timestamp}.wav`;
        var fileWriter = new wav.FileWriter(tempDir + fileName, {
            channels: 1,
            sampleRate: 44100,
            bitDepth: 16
        });
        stream.pipe(fileWriter);
        stream.on('end', function () {
            fileWriter.end();
            console.log('file written');
            processWavFile(fileName);
        });
    });

    client.on('close', function () {
        if (fileWriter != null) {
            fileWriter.end();
            console.log('file written, client closed');
        }
    });
});
