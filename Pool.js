const child = require('child_process');

class Pool {
    constructor(file, maxPool, messageCb) {
        this.pool = [];
        this.active = [];
        this.waiting = [];
        this.maxPool = maxPool;

        let releaseWorker = (function (worker) {
            //move the worker back to the pool array
            this.active = this.active.filter(w => worker !== w);
            this.pool.push(worker);
            //if there is work to be done, assign it
            if (this.waiting.length > 0) {
                this.assignWork(this.waiting.shift())
            }
        }).bind(this);

        for (let i = 0; i < maxPool; i++) {
            let worker = child.fork(file);
            worker.on("message", (...param) => {
                messageCb(...param);
                releaseWorker(worker)
            });
            this.pool.push(worker)

        }
    }

    assignWork(msg) {

        if (this.active.length >= this.maxPool) {
            this.waiting.push(msg);
            console.log(this.waiting)
        }

        if (this.pool.length > 0) {
            let worker = this.pool.pop();
            worker.send(msg);
            this.active.push(worker)
        }
    }

}

module.exports = Pool;