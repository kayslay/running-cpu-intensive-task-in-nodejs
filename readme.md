# Running CPU Intensive Tasks In NodeJs

## Introduction 
Nodejs is good for IO intensive task, but bad for CPU intensive task. The reason Nodejs is bad for CPU intensive task is because it runs on the 
event loop, which runs on a single thread.

The event loop is responsible for every thing that runs on the user-land of Nodejs. This event loop runs on a single thread. When this thread is blocked 
all other task would have to wait for the thread to be unblocked before they can be executed.

I am not an expert on this issue, am only given way in which I achieved this, so if anyone has some to add or some corrections to make about the post
 am opened to advice.
 
## Running Fibonacci
In this article I would be using fibonacci as our cpu intensive task (it take time to run numbers above 45). I am going to create a server that serves 
a simple response for any url that does not match `/fibo`, and when the url matches `/fibo` I will serve a fibonacci result.

In this article I will not use any npm module; I will just be using core node modules for this article. 

## The Server
The server for this article would only return two types of response: 
- A fibonacci number for the `req.headers.fibo` value, when the url route is equal to `fibo`
- A `hello word` string for any url route that does not equal `fibo`

## Lets run the fibo normally
First to show how fibonacci blocks the event loop. I will create a server that serves a fibonacci that runs on the same 
process as the simple `hello world` response.

Create a file called `fibo_in_server.js`. This file would return the fibonacci number of a number passed into the 
`req.headers.fibo` when the url route is equal to the `/fibo` and returns `hello world` for any other url match.

```javascript

        const http = require("http");
        
        function fibo(n) { 
        
            if (n < 2)
                return 1;
            else   return fibo(n - 2) + fibo(n - 1);
        }
        
        const server = http.createServer((req, res) => {
            "use strict";
            if (req.url == '/fibo') {
                let num = parseInt(req.headers.fibo); 
                console.log(num)
                res.end(`${fibo(num)}`) 
            } else {
                res.end('hello world'); 
            }
        });
        
        server.listen(8000, () => console.log("running on port 8000"));
```
We can run the above code and check the response. When the `req.url` is not `/fibo` the response is `hello world` and the fibonacci number of the 
number passed into the header fibo field for a `req.url` that is equal to `/fibo`.

Am using the [postman google extension]() for making request to server. 
    
If we send a number like 45 to the server, the this would block the server until it done getting the fibonacci number. Any request to get the hello world string
would have to wait until the long running fibonacci is done. 

This is not a good for users who just want to get only a simple response, because they have to wait for the fibonacci response to be completed.

In this article, what I am going to do is look at some ways to fix this problem. Am not a **Pro Super NodeJs Guru User**, but i can give some methods of dealing with 
this problem.

## Method of dealing
- running fibonacci in another nodejs process
- using method 1 with a batch queue to process the fibonacci
- using method 2 with a pool to manage the processes

## Method 1: Running in another process
What we can do is run the fibonacci function in another Nodejs process. This would prevent the event loop from getting blocked by the fibonacci function.

To create another process we use the [child_process]() module. I am going to create a file, `fibonacci_runner.js`, that runs as the child 
process, and another file called `server_method1.js`, the parent process. 

The `server_method1.js` serves the response to client. When a request to the `/fibo` is made the server give the work to its child process `fibo_runner.js` to 
handle. This prevents the event loop on the server from getting blocked, making it easier for smaller request to be handled.

Here is the code for `fibonacci_runner.js`

```javascript
        process.on("message", (msg) => {
            "use strict";
            process.send({value: fibo(parseInt(msg.num)),event:msg.event})
        });
        
        function fibo(n) { // 1
            if (n < 2)
                return 1;
            else   return fibo(n - 2) + fibo(n - 1);
        }

```

And here is the code for `server_method1.js`:

```javascript
        const http = require("http");
        const {fork} = require('child_process');
        const child = fork(`${__dirname}/fibonacci_runner.js`);
        let {EventEmitter} = require('events');
        
        let event = new EventEmitter();
        
        
        const server = http.createServer(function(req, res){
        
            if (req.url == '/fibo') {
                let rand = Math.random() * 100; //generate a random number
                
                child.send({num:req.headers.fibo,event:rand});  //send the number to fibonacci_running
        
                event.once(rand, (value) => { //when the event is called
                    res.end(`${value}`)
                })
            } else {
                res.end('hello world');
            }
        });
        
        child.on("message",(msg)=> event.emit(msg.event,msg.value)); //emit the event event sent
        
        server.listen(8000, () => console.log("running on port 8000"));
```
Now if we visit the url route `/fibo` with a value >= 45 in the req.headers.fibo value, it won't block the request for the `hello world`. Better than what we had before.

The next step is to reduce the amount of computation the `fibonacci_runner` does. One way of reducing this is by using a batch queue with/or a cache (note 
there are still other methods of doing this).

 
In this article I am going to discuss about the batch queue alone. You can check out these articles to know more about the cache :
- [...list of article]

And this to know more about batch queue:
- [..list of articles]

### Method 2: Batching queue
> When dealing with asynchronous operations, the most basic level of caching can be achieved by batching together a set of invocations to the same API. The idea is
> very simple: if I am invoking an asynchronous function while there is still another one pending, we can attach the callback to the already running operation, instead of
> creating a brand new request. -- "Nodejs Design Patterns"

From the definition above, we want to batch request with the same req.headers.fibo value together. Instead of calling a new fibonacci call while one with the same req.headers.fibo value 
is still pending.

I am still going to use the `fibonacci_runner.js` to run the fibonacci operation, but we I am going to create a new file, `server_method2.js`, that has 
a asyncBatching function that sit between the `fibonacci_runner.js` and the call to process the `req.headers.fibo`.

Here is the code for `server_method2.js`

```javascript
        const http = require("http");
        const {fork} = require('child_process');
        const child = fork(`${__dirname}/fibonacci_runner.js`);
        let Queue = {}//1
        
        function asyncBatching(num, cb) {
            if (Queue[num]) {
                Queue[num].push(cb) //2
            } else {
                Queue[num] = [cb]; //3
                child.send({num: num, event: num})//4
            }
        }
        
        const server = http.createServer(function (req, res) {
        
            if (req.url == '/fibo') {
                const num = parseInt(req.headers.fibo)
                asyncBatching(num,(value)=>res.end(`${value}`))
            } else {
                res.end('hello world');
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
```

I would use Apache benchmark to run this test 

        $ ab -n 10 -c 10 -H 'fibo: 39' http://localhost:8000/fibo

It takes 3.196 on my machine for **method2** and 32.161 for **method1** . This means method2 responds n times faster than method1 (number of concurrent user sending 
the same req.headers.fibo value).

To improve method2 further we can use a cache to save the value of the fibonacci, but am not going to touch caching in this article :\(. 

What am going to do here is improve on method2 by increasing the number of child processes. I am going to use a pool that would manage the distribution of 
work among the child processes.

### Method 3: Pooling and managing multiple processes
Creating multiple child processes to handle the fibonacci operation would make it respond faster and better. You have to know that running many processes is making
use of system resources. Creating too many process is bad; Just create enough.

The Pool is responsible for handling the child processes.  First let's create a Pool file, `Pool.js`, that exports a a Pool class.

Code for `Pool.js` file:

```javascript
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
```

### Pool class
As said before, the Pool is responsible for handling the child process. It has only one method, the assignWorker method. The assignWorker method 
assigns work to a worker (child process) to handle. If all the worker are busy the work would be done as soon as one is free.

The Pool Object takes three parameter on creation. These arguments are :

- the file to run as the child process
- the number of processes to create
- and the function to call when the workers send a message back

Now let's create `server_method3.js` file that makes use of the Pool Object.

The code for `server_method3.js`:
```javascript
        const http = require("http");
        let Queue = {};
        const Pool = require("./Pool");
        
        let Pooler = new Pool(`${__dirname}/fibonacci_runner.js`,2, (msg) => {
            "use strict";
            let queue = [...Queue[msg.event]];
            Queue[msg.event] = null;  //empty the Queue
            queue.forEach(cb => cb(msg.value));
            console.log(`done with ${msg.event}`)
        });
        
        //responsible for batching
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
                asyncBatching(num, (value) => res.end(`${value}`)) // 
            } else {
                res.end('hello world');
            }
        });
        
        
        server.listen(8000, () => console.log("running on port 8000"));
```
`server_methodw3.js` runs more than one child process, so we can run multiple fibonacci operation at the same time, instead of wait for the one to finish.
the number of fibonacci we can run at the same time depends on the number passed as the second parameter to the Pool constructor.

Note: limit the amount of processes you spawn ups.

## Conclusion

Running heavy task on node event loop is a bad idea, and remember to pass the task to another process to handle, be it nodejs or not (you can start a C++ to handle 
very heavy operations). 

Remember to always keep the event loop from getting blocked by any operation. 

Badewa kayode, peace out.