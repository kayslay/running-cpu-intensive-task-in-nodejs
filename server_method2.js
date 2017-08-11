/**
 * Created by kayslay on 8/4/17.
 */
const http = require("http");
const {fork} = require('child_process');
const child = fork(`${__dirname}/fibonacci_runner.js`);
let Queue = {}

function asyncBatching(num, cb) {
    if (Queue[num]) {
        Queue[num].push(cb)
    } else {
        Queue[num] = [cb];
        child.send({num: num, event: num})
    }
}

const server = http.createServer(function (req, res) {

    if (req.url == '/fibo') {
        const num = parseInt(req.headers.fibo)
        asyncBatching(num,(value)=>res.end(`${value}`))
    } else {
        res.end('hello world');
        console.log('hello')
    }
});

child.on("message", (msg) =>{
    "use strict";
    let queue = [...Queue[msg.event]];
    Queue[msg.event] = null;  //empty the Queue
    queue.forEach(cb=>cb(msg.value))
    console.log(`done with ${msg.event}`)
});

server.listen(8000, () => console.log("running on port 8000"));