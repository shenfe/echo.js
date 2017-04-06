/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

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
                console.log('recorder_start');
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
        window.wstream.resume();
    };

    this.stop = function () {
        recording = false;
        window.wstream.end();
    };
}

window.wclient = new BinaryClient('ws://127.0.0.1:9001');
window.wstream = window.wclient.createStream();
window.wstream.pause();

var audioQueue = [];
function playAudio() {
    if (recordState === 0) {
        if (!audioQueue.length) return;
        audioState = true;
        var audio = new Audio(audioQueue.shift());
        audio.play();
        audio.addEventListener('ended', function () {
            audioState = false;
            playAudio();
        });
    } else {
        setTimeout(playAudio, 200);
    }
}

var audioState = false;
var recordState = 0; // 0: not recording, 1: recording

var socket = io.connect('http://127.0.0.1:3883');
socket.on('speech comes', function (data) {
    audioQueue.push(data.url);
    playAudio();
});


/***/ })
/******/ ]);