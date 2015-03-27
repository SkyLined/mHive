mHive
===============

Module with classes to distribute activities on machines.

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
      };
    });
  });
  ```

Notes
-----
The `cWorker` and `cMaster` instances can be on the same machine or on two
different machines. By default `cWorker` listens for `cMaster` connects to the local machine.

`cMaster` instances periodically broadcast a message over UDP that request any
`cWorker` instances to connect to it. `cWorker` instances listen for such UDP
messages and connect to the `cMaster` instance when one is received, unless a
connection to that `cMaster` instance has already been established.

API
-----
### `class cWorker`
Can be used to perform activities at the request of a (remote) `cWorker`.

#### Constructors:
##### `[new] mHive.cWorker(Object dxOptions, Object dfActivities);`
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `Number uPort`: port number to send to (default: 28876).
And `dfActivities` is an associative array of activities. Each activity is
identified by  a (string) name, which is associateed with a function that
performs the activity and returns a result. The result must be a value that
can be converted to a string using `JSON.stringify`

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
At regular intervals, a `cMaster` instance will broadcast over UDP to the local
subnet. This broadcast contains a request for `cWorkers` to connect to it. Once
a worker is connected, request can be made for it to perform activities and
return the results.

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

--------------------------------------------------------------------------------

### License
This code is licensed under [CC0 v1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
