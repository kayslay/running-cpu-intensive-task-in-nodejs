/**
 * Created by kayslay on 8/4/17.
 */

process.on("message", (msg) => {
    "use strict";
    process.send({value: fibo(parseInt(msg.num)),event:msg.event})
})

function fibo(n) { // 1
    if (n < 2)
        return 1;
    else   return fibo(n - 2) + fibo(n - 1);
}

