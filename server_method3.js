/**
 * Created by kayslay on 8/5/17.
 */
const http = require("http");
let Queue = {};
const Pool = require("./Pool");

let Pooler = new Pool(`${__dirname}/fibonacci_runner.js`,3, (msg) => {
    "use strict";
    let queue = [...Queue[msg.event]];
    Queue[msg.event] = null;  //empty the Queue
    queue.forEach(cb => cb(msg.value));
    console.log(`done with ${msg.event}`)
});

function asyncBatching(num, cb) {
    if (Queue[num]) {
        Queue[num].push(cb)
    } else {
        Queue[num] = [cb];
        Pooler.assignWork({num: num, event: num})
    }
}

const server = http.createServer(function (req, res) {

    if (req.url == '/fibo') {
        const num = parseInt(req.headers.fibo);
        asyncBatching(num, (value) => res.end(`${value}`))
    } else {
        res.end('hello world');
    }
});

server.listen(8000, () => console.log("running on port 8000"));