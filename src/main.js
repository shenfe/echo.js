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
        console.log('play_start', Date.now());

        playAndVisualizeAudio(audioQueue.shift(), function () {
            audioState = false;
            console.log('play_end', Date.now());
            setTimeout(playAudio, 1000);
        });
    } else {
        setTimeout(playAudio, 1000);
    }
}
function playAudioSimply(url, onEnd) {
    var audio = new Audio(url);
    audio.play();
    audio.addEventListener('ended', function () {
        onEnd();
    });
}
window.audioBufferSouceNode = null;
window.audioBufferAnimationId = null;
function playAndVisualizeAudio(url, onEnd) {
    var req = function (fileUrl, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.responseType = 'blob';
        xhr.onload = function (e) {
            if (this.status == 200) {
                var myBlob = this.response; // myBlob is now the blob that the object URL pointed to.
                callback(myBlob);
            }
        };
        xhr.send();
    };

    var doWithBlob = function (blob, visualizer, doOnEnd) {
        var fr = new FileReader();
        fr.onload = function (e) {
            var fileResult = e.target.result;
            if (audioContext == null) {
                return;
            }
            console.log('decoding the audio');
            audioContext.decodeAudioData(fileResult, function (buffer) {
                console.log('decode succussfully, start the visualizer');
                visualizer(audioContext, buffer, doOnEnd);
            }, function (e) {
                console.log('fail to decode the file');
                console.log(e);
            });
        };
        fr.onerror = function (e) {
            console.log('fail to read the file');
            console.log(e);
        };
        // assign the file to the reader
        console.log('starting read the file');
        fr.readAsArrayBuffer(blob);
    };

    var clear = function () {
        if (window.audioBufferAnimationId !== null) {
            console.log('cancel the animation');
            cancelAnimationFrame(window.audioBufferAnimationId);
            window.audioBufferAnimationId = null;
        }
        if (window.audioBufferSouceNode !== null) {
            window.audioBufferSouceNode.stop(0);
            window.audioBufferSouceNode = null;
        }

        reset_canvas: {
            var canvas = document.getElementById('speechBufferCanvas');
            var canvasCtx = canvas.getContext('2d');
            var WIDTH = canvas.width, HEIGHT = canvas.height;
            canvasCtx.fillStyle = 'rgb(255, 255, 255)';
            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
            // canvasCtx.lineWidth = 2;
            // canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
            // canvasCtx.moveTo(0, HEIGHT/2);
            // canvasCtx.lineTo(WIDTH, HEIGHT/2);
            // canvasCtx.stroke();
            console.log('reset audio canvas');
        }
    };

    var visualize = function (audioContext, buffer, doOnEnd) {
        var audioBufferSouceNode = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser();
        // connect the source to the analyser
        audioBufferSouceNode.connect(analyser);
        // connect the analyser to the destination(the speaker), or we won't hear the sound
        analyser.connect(audioContext.destination);
        // then assign the buffer to the buffer source node
        audioBufferSouceNode.buffer = buffer;
        // stop the previous sound if any
        clear();
        // play the source
        audioBufferSouceNode.start(0);
        window.audioBufferSouceNode = audioBufferSouceNode;
        audioBufferSouceNode.onended = function () {
            clear();
            doOnEnd();
        };
        console.log('playing...');
        window.audioBufferAnimationId = drawSpectrum(analyser);
    };

    var drawSpectrum = function (analyser) {
        var canvas = document.getElementById('speechBufferCanvas');
        var canvasCtx = canvas.getContext('2d');
        var WIDTH = canvas.width, HEIGHT = canvas.height;

        analyser.fftSize = 2048;
        var bufferLength = analyser.fftSize;
        var dataArray = new Uint8Array(bufferLength);

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        function draw() {
            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = 'rgb(255, 255, 255)';
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

            canvasCtx.beginPath();

            var sliceWidth = WIDTH * 1.0 / bufferLength;
            var x = 0;

            for (var i = 0; i < bufferLength; i++) {
                var v = dataArray[i] / 128.0;
                var y = v * HEIGHT/2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(WIDTH, HEIGHT/2);
            canvasCtx.stroke();

            window.audioBufferAnimationId = requestAnimationFrame(draw);
        };

        return requestAnimationFrame(draw);
    };

    req(url, function (blob) {
        doWithBlob(blob, visualize, onEnd);
    });
}

var audioState = false;
var recordState = 0; // 0: not recording, 1: recording

var socket = io.connect('http://127.0.0.1:3883');
socket.on('speech comes', function (data) {
    audioQueue.push(data.url);
    playAudio();
});
