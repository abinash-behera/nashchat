#!/bin/env node
/*
************************************ working code -- starts

var app = require('express')();
var httpServer = require('http').Server(app);
var io = require('socket.io')(httpServer);

//Set the environment variables we need.
var ipaddress = process.env.OPENSHIFT_NODEJS_IP;
var port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

if (typeof ipaddress === "undefined") {
    //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
    //  allows us to run/test the app locally.
    console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
    ipaddress = "127.0.0.1";
};

app.get('/', function(req,res){
	//res.sendFile('/run/media/abinashb/SpiderMan/Projects/NodeJs/socketio/chat-example/nash_landing.html');
	res.setHeader('Content-Type', 'text/html');
	res.sendFile(__dirname + '/nash_landing.html'); //This will give 'TypeError: res.sendFile is not a function at /run/media/abinashb/SpiderMan/Projects/NodeJs/socketio/nashchat/nashchat/server.js:8:6 at callbacks ' error if we change the express version from "express": "^4.10.2" to "express": "~3.4.4"
})

io.on('connection', function(socket){
  console.log('a user connected');
  //this is fired when the client disconnects
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  //custom event
  socket.on('chat message', function(msg){
    console.log('message:' + msg);
    //Behaves like a group chat because of broadcast
    socket.broadcast.emit('chat message', msg);
    //broadcast is better - checkout the page for more info
    //io.emit('chat message', msg);
  });
});

httpServer.listen(port, ipaddress, function() {
    console.log('%s: Node server started on %s:%d ...',
                Date(Date.now() ), ipaddress, port);
});

//httpServer.listen(3000, function(){
//  console.log('listening on *:3000');
//})

working code -- ends ************************************************
*/


//  OpenShift nashchat Node application
var express = require('express');
var fs      = require('fs');
var clientArray = [];
var clientCounter = -1;
var allClientNames = [];
var hookUps = {};

/**
 *  Define the nashchat application.
 */
var nashChatApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    //TODO do we need cache
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'nash_landing.html': '' };
        }

        //  Local cache for static content.
        self.zcache['nash_landing.html'] = fs.readFileSync('./nash_landing.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating nashchat app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('nash_landing.html') );
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express(); //don't use createServer here - leads to error

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the nashchat application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();

        //TODO see if this is a proper place to place the static content
        self.app.use(express.static(__dirname + '/css'));
    };


    /**
     *  Start the server (starts up the nashchat application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
//        self.app.listen(self.port, self.ipaddress, function() {
//            console.log('%s: Node server started on %s:%d ...',
//                        Date(Date.now() ), self.ipaddress, self.port);
//        });

        httpServer = require('http').Server(self.app);
        io = require('socket.io')(httpServer);
        io.on('connection', function(socket){
        	  // console.log('a user connected');

        	  //TODO take into account already open tabs -- if some tabs are already open then on restarting the server the array is not of zero length
        	  //adding this client to the clients arrays; TODO don't use index, use socket unique number as index
        	  clientArray[++clientCounter] = socket;

        	  //this is fired when the client disconnects
        	  socket.on('disconnect', function(){
        		socket.broadcast.emit('client left', socket.username);
        	    console.log('user disconnected');
        	  });

        	  //event for registering the username
        	  socket.on('give all clients', function() {
        		  socket.emit('take all clients', allClientNames);
        	  });

        	  //event for sending all online clients
        	  socket.on('username', function(username) {
        		  socket.username = username;
        		  allClientNames[clientCounter] = username;
        		  socket.broadcast.emit('new client', username);
        	  });

            //custom event sending the chat messages
    			  socket.on('chat message', function(msg) {
      				// console.log('message:' + msg);
              var thisUsername = socket.username;
      				// Behaves like a group chat because of broadcast
      				// socket.broadcast.emit('chat message', msg);
      				// broadcast is better - checkout the demo page from socket.io
      				// website for more info
      				// io.emit('chat message', msg);

      				// realized I don't need broadcast but to just emit
              clientArray.forEach(function (eachClient, index, array){
                //TODO this is executed for each message -- very bad; use the sockeet map for this
                if (eachClient.username === hookUps[thisUsername]) {
                  // console.log('eachClient.username:' + eachClient.username);
                  eachClient.emit('chat message', msg);
                  return; //TODO is this good
                }
              });
      			});

            //connect with user
            socket.on('hook', function(fromUserName, toUserName) {
              // TODO some checks
        		  hookUps[fromUserName] = toUserName;
              hookUps[toUserName] = fromUserName;
              // console.log('hookUps:' + hookUps);
        	  });
        });

        // starting the app -- commented the above starting code and using this
		// code for binding the port with io as io is taking httpserver as input
		// while creation. If we use the earlier/default code for starting then
		// io won't be able to access the port. IO always needs a server object
		// (if we pass express object then it will lead to error)
        httpServer.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  nashchat Application.  */



/**
 *  main():  Main code.
 */
var thisapp = new nashChatApp();
thisapp.initialize();
thisapp.start();
