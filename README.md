# echo.js

This lib (or demo) does the following things to simulate a chat between a browser and a server:

1. Browser detects any voice activity, records and sends speech s1 to Server;
2. Server receives speech s1;
3. Server constructs and sends speech s2 to Browser;
4. Browser receives and plays speech s2.

**Notice** Browser won't record and play at the same time, thus there is a task queue.

**Notice** Server will save all speeches with `userId` and `timestamp`.

## Start

### Install

  `$ npm install`

### Build
  `$ webpack`

### Run Server

  `$ npm start`

### Test in Browser

Open `127.0.0.1:3883`.

## Thanks

Great work from:

1. [browser-pcm-stream](https://github.com/gabrielpoca/browser-pcm-stream)
2. [vad.js](https://github.com/kdavis-mozilla/vad.js)
3. [socket.io](https://socket.io/)
4. [binary.js](https://github.com/binaryjs/binaryjs)

## License

MIT
