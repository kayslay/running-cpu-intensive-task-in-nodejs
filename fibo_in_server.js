/**
 * Created by kayslay on 8/4/17.
 */

const http = require("http");

function fibo(n) { // 1

    if (n < 2)
        return 1;
    else   return fibo(n - 2) + fibo(n - 1);
}

const server = http.createServer((req, res) => {
    "use strict";
    if (req.url == '/fibo') {
        let num = parseInt(req.headers.fibo); //2
        console.log(num)
        res.end(`${fibo(num)}`) //3
    } else {
        res.end('hello world'); //4
    }
});

server.listen(8000, () => console.log("running on port 8000"));