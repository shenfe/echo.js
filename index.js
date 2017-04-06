var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3883);
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/records'));
app.get('/', function (req, res) {
    res.redirect('index.html');
});

var iosocket = null;
io.on('connection', function (socket) {
    iosocket = socket;
    console.log('Connection ' + socket.id + ' accepted');
    socket.on('disconnect', function () {
        console.log('Connection ' + socket.id + ' terminated');
    });
});

var binaryServer = require('binaryjs').BinaryServer({
    host: '127.0.0.1',
    port: 9001
});

var wav = require('wav');
var sox = require('sox');

// speech音频文件存放目录
var tempDir     = './records/tmp/';
var recordDir   = './records/';

// 将原始speech文件转成指定格式，例如进行重采样
var soxTaskExec = function (fileName, callback) {
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
        callback(fileName);
    });
    job.start();
};

// speech文件已经重采样生成完毕，最终要构造一个新的speech文件回传给client
var speechFileHander = function (filePath, client) {
    // var file = fs.createReadStream(filePath);
    // client.send(file);

    if (iosocket) {
        iosocket.emit('speech comes', {url: 'http://127.0.0.1:3883/' + filePath});
    }
};

// 原始speech文件已经生成完毕，需要转成指定格式（重采样等）
var processWavFile = function (fileName, client) {
    soxTaskExec(fileName, function (resampledFileName) {
        speechFileHander(resampledFileName, client);
    });
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
            if (fileWriter) {
                fileWriter.end();
                console.log('file written');
                processWavFile(fileName, client);
            }
        });
    });

    client.on('close', function () {
        if (fileWriter) {
            fileWriter.end();
            console.log('file written, client closed');
        }
    });
});
