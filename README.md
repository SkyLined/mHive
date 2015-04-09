mHive
===============

<<<<<<< HEAD
Module with classes to distribute activities on machines across a network.

This module can be used to create workers as well as masters running on multiple
machines on the network. The masters will automatically ask the workers to
connect to them, after which the masters and workers can make remote procedure
calls. This allows you to create a master that runs code on a number of workers
and gathers the results.
=======
Module with classes to distribute activities on machines.
>>>>>>> origin/master

Getting Started
---------------
1. Install mHive via NPM.
  
  `npm install mhive`
  
  Optionally: rename `mhive` to `mHive`: npm is unable to handle the
  complexity of uppercase characters in a module name. Node.js on Windows does
  not have this problem, so renaming the folder is not required for you to use
  the module.
  
2. Require mHive in your project.
  
  `var mHive = require("mHive");`

3. Instantiate a `cWorker` on one machine to be able to run activities on it.
  ```
<<<<<<< HEAD
  var dfProcedures = {
    "Send greetings": function (oTCPJSONRPC, xData, fCallback) {
      if (typeof(xData) !== "string") {
        fCallback(new Error("Expected data to be a string, got " + typeof(xData)));
      } else {
        fCallback(undefined, "Hello, " + xData + "!");
      }
    },
  };
  var oHiveWorker = new mHive.cWorker(dfProcedures);
  ```

4. Instantiate a `cMaster` to be able to enumerate active `cWorker` instances
   on the local network and run activities on them.
  ```
  var oHiveMaster = new mHive.cMaster();
  oHiveMaster.on("connect", function (oTCPJSONRPCConnection) {
    oTCPJSONRPCConnection.fCall("Send greetings", "world", function (oError, xResult) {
      if (oError) {
        console.log(oError); // Handle error
      } else {
        console.log(xResult); // Handle result, outputs "Hello, world!".
=======
  var dfActivities = {
    "Send greetings": function (oHiveWorkerConnectionToMaster, xData) {
      return "Hello, world!";
    },
  };
  var oHiveWorker = new mHive.cWorker({}, dfActivities);
  ```

4. Instantiate a `cMaster` to be able to enumerate active `cWorker` instances
   and run activities on them.
  ```
  var oHiveMaster = new mHive.cMaster();
  oHiveMaster.on("connect", function (oConnectionToWorker) {
    oConnectionToWorker.fRequestActivity("Send greetings", function (oError, xResult) {
      if (oError) {
        // Handle oError
      } else {
        console.log(xResult); // Output "Hello, world!" result of activity.
>>>>>>> origin/master
      };
    });
  });
  ```

Notes
-----
The `cWorker` and `cMaster` instances can be on the same machine or on two
<<<<<<< HEAD
different machines. `cMaster` instances periodically broadcast a message over
UDP that requests `cWorker` instances to connect to it. `cWorker` instances
listen for such UDP messages and connect to the `cMaster` instance when they
receive one (unless a connection to that `cMaster` instance already exists).

When a master receives a connection from a worker, it emits a `connect` event.
When a worker connects to a master, it also emits a `connect` event. Both these
events have an `mTCPJSONRCP.cConnection` instance as the first argument, which
can be used to make remote procedure calls. See [mTCPJSONRPC]
(https://github.com/SkyLined/mTCPJSON) for more details about how to make
remote procedure calls using these objects.
=======
different machines. By default `cWorker` listens for `cMaster` connects to the local machine.

`cMaster` instances periodically broadcast a message over UDP that request any
`cWorker` instances to connect to it. `cWorker` instances listen for such UDP
messages and connect to the `cMaster` instance when one is received, unless a
connection to that `cMaster` instance has already been established.
>>>>>>> origin/master

API
-----
### `class cWorker`
<<<<<<< HEAD
Can be used to create connections to (remote) `cMaster` instances. These
connections can be used to to request remote procedure calls from the master as
well as allow the master to request remote procedure calls from the worker.
### `class cMaster`
Can be used to request and accept connections from (remote) `cWorker` instances.
These connections can be used to request remote procedure calls from the worker
as well as allow the worker to request remote procedure calls from the master.

#### Constructors:
##### `[new] mHive.cWorker(Object dxOptions);`
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `String sHostName`: device to receive UDP broadcasts on (default: machine
    hostname, use "localhost" to receive only UDP messages from the local
    machine).
- `Number uPort`: port number to listen for UDP broadcasts on (default: 28876).
- `Number uConnectionKeepAlive`: Time in milliseconds between TCP connection
    keep alive packets (detault: undefined, meaning do not use TCP keep alive).
- `Object dfProcedures` an associative array describing the procedures the
    remote end of the connection can request. See below for more details.
##### `[new] mHive.cMaster(Object dxOptions);`
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `String sHostName`: device to send UDP broadcasts on as well as bind the TCP
    server socket to (default: machine hostname, use "localhost" to allow only
    connections from the local machine).
- `Number uPort`: port number to send UDP broadcasts on as well as bind the TCP
    server socket to (default: 28876).
- `Number uBroadcastInterval`: Time in milliseconds between sending connection
    requests over UDP (default: 10,000, `undefined` means do not automatically
    send such requests).
- `Number uConnectionKeepAlive`: Time in milliseconds between TCP connection
    keep alive packets (detault: undefined, meaning do not use TCP keep alive).
- `Number uMTU`: Maximum Transmit Unit for the network, which is used when
    sending UDP packets (default: undefined, meaning automatically determine
    if possible).
- `Object dfProcedures` an associative array describing the procedures the
    remote end of the connection can request. See below for more details.

`dxOptions.dfProcedures` contains functions identified by a (string) name, which
represent the procedures that can be called remotely. These functions take three
arguments:
1. a `cConnection` instance that represents the connection over which the
    request was made.
2. a value of any type, provided by the caller, which serves as the arguments/
    parameters of the procedure call.
3. a callback function that should be called if the procedure wants to return a
    value or report an error.
This callback function takes two arguments:
1. an `Error` instance or `undefined` to indicate if there was an error or not
    and provide details on the error.
2. a value of any type that represents the result of the procedure call. This
   argument is ignored if the first argument is not `undefined`.
Both these two arguments must be values that can be converted to a string using
`JSON.stringify`, as they will be send back to the caller.

#### Events:
These apply to `cWorker` and `cMaster` instances
##### `error`, parameter: `Error oError`
Emitted when there is an error in the network connection.
##### `start`
Emitted when the worker is waiting for connect requests from a master, or when
a master is accepting connections and sending out connection requests.
##### `connect`, parameter: `mTCPJSONRCP.cConnection oConnection`
Emitted when a worker establishes a connection to a master or when a master
has accepted a connection from a worker. 
##### `stop`
Emitted by a worker when it has no more connections to masters and stopped
listening for new connection requests. Emitted by a master when it has no more
connections to workers, is not accepting any new connections and no longer
sending connection request. This can happen when there is a network error or
after you tell the worker/master to stop.

#### Properties:
These apply to `cWorker` and `cMaster` instances
##### `Object dfProcedures`
An associative array of procedures that can be called. It is initially provided
through the `dfProcedures` property of the `dxOptions` argument of the
constructor. Procedures can be added and removed from the object at any time.
See above for more details.

#### Methods:
##### `undefined fStop(Boolean bDisconnect)`
''Applies to both `cWorker` and `cMaster` instances.''
Causes a worker to stop listening for connection requests and make new
connections. Causes a master to stop broadcasting connection requests and accept
new connections. if `bDisconnect` is `true`, all existing connections emitted
by the object are disconnected.

##### `undefined fSendConnectionRequest()`
''Applies only to `cMaster` instances.''
Broadcast a request for workers to connect. This is also done periodically if
`dxOptions.uBroadcastInterval` was not `undefined`. 
=======
Can be used to perform activities at the request of a (remote) `cWorker`.

#### Constructors:
##### `[new] mHive.cWorker(Object dxOptions, Object dfActivities);`
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `Number uPort`: port number to send to (default: 28876).
And `dfActivities` is an associative array of activities. Each activity is
identified by  a (string) name, which is associated with a function that
performs the activity and returns a result. The result must be a value that
can be converted to a string using `JSON.stringify`.

#### Events:
##### `error`, parameter: `Error oError`
Emitted when there is a network error.
##### `start`
Emitted when the worker is waiting for connect requests from a master.
##### `message`, parameter: `Object oSender`, `Error oError`, `Any xMessage`
Emitted when a message is received over UDP. Requests to connect to a master are
sent this way, but other messages may also trigger this event.
##### `connect`, parameter: `cWorkerConnectionToMaster oConnection`
Emitted when a connection to a master is established at the request of that
master. 
##### `disconnect`, parameter: `cWorkerConnectionToMaster oConnection`
Emitted when a connection to a master is disconnected.
##### `stop`
Emitted when the worker no more connections to masters and stopped listening
for new connection requests. This can happen when there is a network error or
after you tell the worker to stop.

#### Properties:
##### `Object dfActivities`
An associative array of activities that the worker can perform. Each activity is
identified by  a (string) name, which is associated with a function that
performs the activity and returns a result. The result must be a value that
can be converted to a string using `JSON.stringify`.

#### Methods:
##### `undefined fStop()`
Close all connections to masters and stop listening for new connection requests.

### `class cWorkerConnectionToMaster`
Emitted by the `connect` event of `cWorker` instances. Used to read requests to
perform activities send by the master and perform them. When a request to
perform an activity is received, and the activity is listed in the
`dfActivities` argument past to the `cWorker` constructor, the associated
function is called with the connection as the first argument, as in:
`fActivity(cWorkerConnectionToMaster oConnection, Any xData)`. The second
argument is whatever data the master sent with the request, which is usually
some form of parameter needed to perform the requested activity. The return
value of the `fActivity` function is send back to the master as the result of
the activity.

#### Properties:
##### `cWorker oWorker`
A reference to the worker that emitted this cWorkerConnectionToMaster instance. 

#### Methods:
##### `undefined fDisconnect()`
Close this connection to the master.

### `class cMaster`
Can be used to enumerate workers and the activities they can perform as well as
request them to perform these activities.

#### Constructors:
##### `[new] mHive.cMaster(Object dxOptions);`
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `String sHostname`: Network device to bind to (default: computer name, use
             `localhost` if you want to accept connections only from scripts
             running on the same machine).
- `Number uPort`: port number to use (default: 28876).
- `Number uBroadcastInterval`: interval in millseconds between broadcasting
             connection requests to the local subnet (default: 10,000).
- `Number uConnectionKeepAlive`: Enable sending [TCP keep-alive](http://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)
          packets every `uConnectionKeepAlive` milliseconds.
- `Number uMTU`: Maximum Transfer Unit (default: `undefined` - the code will
                attempt to determine the value automatically if needed).
At regular intervals, a `cMaster` instance will send over UDP to the local
subnet a request for `cWorkers` to connect to it. Once a worker is connected,
request can be made for it to perform activities.

#### Events:
##### `error`, parameter: `Error oError`
Emitted when there is a network error.
##### `start`
Emitted when the master is sending connection requests to workers and waiting
for them to connect.
##### `connect`, parameter: `cMasterConnectionToWorker oConnection`
Emitted when a worker connects to the master. 
##### `disconnect`, parameter: `cMasterConnectionToWorker oConnection`
Emitted when a worker is disconnected from the master.
##### `stop`
Emitted when the master is not connected to any workers, no longer sending
connection requests to workers and not accepting new connections from workers.
This can happen when there is a network error or after you tell the master to
stop.

#### Methods:
##### `cMasterConnectionToWorker[] faoGetConnections()`
Return an array of `cMasterConnectionToWorker` instances that represent all
active connections to workers.
##### `undefined fStop()`
Stop sending connection requests, close all existing connections to workers and
do not accept any new connections from workers.

### `class cMasterConnectionToWorker`
Emitted by the `connect` event of `cMaster` instances. Used to send requests to
perform activities to the workers and read the results.

#### Properties:
##### `cMaster oMaster`
A reference to the master that emitted this cMasterConnectionToWorker instance. 

#### Methods:
##### `undefined fGetListOfActivities(Function fCallback)`
Request a list of activities that the worker is able to perform. 
`fCallback(Error oError, String[] asActivityNames)` is called when the list
cannot be requested (`oError` will contain details) or when the list was
successfully received (`oError will be `undefined`, `asActivityNames` is an
array containing strings that represent the names of the activities the worker
can perform.

##### `undefined fRequestActivity(String sActivity, Any xData, Function fCallback)`
Request the worker to perform the activity identified by the name in `sActivity`
and send whatever value is in `xData` to the worker to be passed to the activity
as a parameter (See `class cWorkerConnectionToMaster` for details).
`fCallback(Error oError, Any xResult)` is called if there was an error (`oError`
will contain details) or if the activity was successfully perform (`oError` will
be undefined, `xResult` contains data returned by the activity).

##### `undefined fDisconnect()`
Close this connection to the worker.
>>>>>>> origin/master

--------------------------------------------------------------------------------

### License
This code is licensed under [CC0 v1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
