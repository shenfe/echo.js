// Create AudioContext
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var audioSampleRate = audioContext.sampleRate;

// Define function called by getUserMedia
function startUserMedia(stream) {
    // Create MediaStreamAudioSourceNode
    var source = audioContext.createMediaStreamSource(stream);

    // Recorder
    var recorder = new recordAudio(source);

    // Setup options
    var options = {
        source: source,
        voice_stop: function () {
            console.log('voice_stop');
            if (recordState === 1) {
                recorder.stop();
                console.log('recorder_stop');
                recordState = 0;
            }
        },
        voice_start: function () {
            console.log('voice_start');
            if (!audioState) {
                recordState = 1;
                recorder.start();
                console.log('recorder_start', Date.now());
            }
        }
    };

    // Create VAD
    var vad = new VAD(options);
}

// Ask for audio device
navigator.getUserMedia = navigator.getUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia;
navigator.getUserMedia({
    audio: true
}, function (stream) { // onSuccess
    startUserMedia(stream);
}, function (e) { // onError
    console.log('No live audio input in this browser: ' + e);
});

// Record audio
function recordAudio(stream) {
    var bufferLen   = 2048,
        numChannels = 1;
    this.context = stream.context;
    var recording = false;
    this.node = (this.context.createScriptProcessor ||
        this.context.createJavaScriptNode).call(this.context,
        bufferLen, numChannels, numChannels);

    stream.connect(this.node);
    this.node.connect(this.context.destination);

    function convertFloat32ToInt16(buffer) {
        l = buffer.length;
        buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
        }
        return buf.buffer;
    }

    this.node.onaudioprocess = function (e) {
        if (!recording) return;

        // Since numChannels is 1
        window.wstream.write(convertFloat32ToInt16(e.inputBuffer.getChannelData(0)));
    };

    this.start = function () {
        recording = true;
        window.wstream = window.wclient.createStream();
        console.log('stream_start', Date.now());
    };

    this.stop = function () {
        recording = false;
        window.wstream.end();
        console.log('stream_end', Date.now());
    };
}

window.wclient = new BinaryClient('ws://127.0.0.1:9001');

var audioQueue = [];
function playAudio() {
    if (recordState === 0) {
        if (!audioQueue.length) return;
        audioState = true;
        var audio = new Audio(audioQueue.shift());
        console.log('play_start', Date.now());
        audio.play();
        audio.addEventListener('ended', function () {
            audioState = false;
            console.log('play_end', Date.now());
            playAudio();
        });
    } else {
        setTimeout(playAudio, 1000);
    }
}

var audioState = false;
var recordState = 0; // 0: not recording, 1: recording

var socket = io.connect('http://127.0.0.1:3883');
socket.on('speech comes', function (data) {
    audioQueue.push(data.url);
    playAudio();
});
