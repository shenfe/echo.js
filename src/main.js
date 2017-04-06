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
            recorder.stop();
        },
        voice_start: function () {
            console.log('voice_start');
            recorder.start();
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
    };

    this.stop = function () {
        recording = false;
        window.wstream.end();
    };
}

window.wclient = new BinaryClient('ws://127.0.0.1:9001');

function playAudio(url) {
    var audio = new Audio(url);
    audio.play();
}

var socket = io.connect('http://127.0.0.1:3883');
socket.on('speech comes', function (data) {
    playAudio(data.url);
});
