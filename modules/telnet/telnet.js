var EventEmitter = require('events').EventEmitter;
var net = require('net');
var util = require('util');

/*
var n = new (require("./telnet.js")).Telnet({
  host : "10.0.1.20",
  commands : {
    "MacMini" : "GAME",
    "Sonos" : "DVR"
  }
});
*/

/**
 * Generic telnet command sender for Route
 */
function Telnet(data) {
  this.host = data.host;
  this.port = data.port || 23;

  // Map of source names to ids.
  this.commands = data.commands ? data.commands : {};
  
  // Create reverse commands map - you'd do this to make Telnet
  // emit specific events when it sees certain commands (not implemented)
  this.commandIds = {};
  for (var name in this.commands) {
    var id = this.commands[name];
    this.commandIds[id] = name;
  }

  this.debug = false;
  this.commandQueue = [];
  this.connect();
};
util.inherits(Telnet, EventEmitter);

Telnet.prototype.send = function(string) {
  var isFirstRequest = (this.commandQueue.length == 0);
  this.commandQueue.push(string);
  if (isFirstRequest)
    process.nextTick(this.sendNextCommand.bind(this));
};

Telnet.prototype.sendNextCommand = function() {
  if (!this.commandQueue.length) return;
  var string = this.commandQueue.shift();
  this.client.write(string + "\r", "UTF8", function () {
    setTimeout(this.sendNextCommand.bind(this), 300);  
  }.bind(this));
};

Telnet.prototype.exec = function(command) {
  console.log("*  Telnet Executing: " + command);

  var segments = command.split(".");

  var action = segments.shift();
  if (this.commands[action]) {
    this.send(this.commands[action]);
  }
};

Telnet.prototype.parseData = function(data) {
  if (this.debug) console.log("Telnet", data);
  // TODO emit event if data matches a command
}

// Connection
Telnet.prototype.connect = function() {
  this.reconnecting_ = false;
  this.client = net.connect({
    host : this.host,
    port : this.port
  });

  this.client.on('data', this.handleData.bind(this));
  this.client.on('error', this.handleError.bind(this));
  this.client.on('close', this.handleError.bind(this));
};

Telnet.prototype.reconnect = function() {
  if (this.reconnecting_) return;

  this.reconnecting_ = true;
  setTimeout(this.connect.bind(this), 1000);
};

Telnet.prototype.handleData = function(data) {
  data = (data + "").trim();
  console.log(data);
  
  this.parseData(data.split("\r\n").shift());
};

Telnet.prototype.handleError = function(e) {
  console.log("! Telnet\t" + e);
  this.reconnect();
};

Telnet.prototype.handleEnd = function() {
  this.emit("sourceEvent", "Telnet.Disconnected");
  this.reconnect();
};

Telnet.prototype.log = function(data) {
  console.log("Telnet LOG:" + data);
  this.emit("sourceEvent", "Logged");
}

exports.Telnet = Telnet;
