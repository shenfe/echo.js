# echo.js

This lib or demo or wrapper does the following things to simulate a chat between a browser and a server:

1. the browser (as a peer) streams the audio in PCM via WebRTC to the server;
2. the server (as the other peer) processes the audio stream, parses speeches;
3. the server constructs voices and sends via WebRTC to the browser.
