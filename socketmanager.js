/** 
 * SocketManager - Singleton to manage multi-channel socket 'routing', need a way to merge with socket.io so client sessions aren't stored twice in memory,
 *
 * Requires Socket.IO-node and Socket.IO client libraries.
 *
 * Usage:
 *   in your main app.js file (or whereever you create the server)
 *
 *   var io = require('socket.io'),
 *       sm = require('socketmanager');
 *
 *   socket = io.listen(server);  // or io.listen(app) in express
 *
 *   sm.register(socket);
 *
 *   // Then Register methods that will be run based on the 'msgType' attribute sent from the client in each message
 *   sm.on('joinChat', function(client, messageJSON){
 *       // do something here (i.e. send message back to client, broadcast something, etc.)
 *   });
 *
 */
var SocketManager = exports.SocketManager = function(){
    this.socket = null;
    this.methods = {};
    this.sessions = {};
    this.channels = {};
};

SocketManager.prototype.register = function(socket, options){
    var context = this;
    
    this.socket = socket;
    
    this.socket.on('connection', function(client){

        context.connect(client);

        client.on('message', function(msg){
            context.receive(client, msg);
        });
        
        client.on('disconnect', function(){
            context.disconnect(client);
        });

    });
};
    
SocketManager.prototype.connect = function(client){
    this.sessions[client.sessionId] = client;
};

SocketManager.prototype.disconnect = function(client){
    if (client.channels && client.channels.length>0){
        for (var i=0;i<client.channels.length;i++){
            var chn = this.channels[client.channels[i]];
            chn.splice(chn.indexOf(client.sessionId),1);

            // If it was the last one, delete it:
            if (chn.length==0){
                delete this.channels[client.channels[i]];
            }
        }
    }
    delete this.sessions[client.sessionId];
};

SocketManager.prototype.receive = function(client, msg){
    //var parsed = JSON.parse(msg);
    var parsed = msg;
    if (parsed.msgType && this.methods[parsed.msgType]){
        this.methods[parsed.msgType](client, parsed);
    }
};
    
SocketManager.prototype.send = function(msgType, sessionId, msgObj){
    if (this.sessions[sessionId]){
        msgObj.msgType = msgType;
        this.sessions[sessionId].send(JSON.stringify(msgObj));
    }
};

SocketManager.prototype.connectToChannel = function(client, channelId){
    if (!this.channels[channelId]){
        this.channels[channelId] = [];
    }
    
    this.channels[channelId].push(client.sessionId);
	
    if (!client.channels){
		    client.channels = [];
    }
    client.channels.push(channelId);
};
    
SocketManager.prototype.exitFromChannel = function(client, channelId){
    if (this.channels[channelId]){
        var clientId = this.channels[channelId].indexOf(client.sessionId);
        if (clientId != -1) {
            this.channels[channelId].remove(clientId);
        }
    }
    if (client.channels){
        var channelIndex = client.channels.indexOf(channelId);
        if (channelIndex != -1) {
            client.channels.remove(channelIndex);
        }
    }
};
    
SocketManager.prototype.broadcastToChannel = function(client, channelId, msgType, msgObj){
    if (this.channels[channelId]){
        msgObj['msgType'] = msgType;
        var msg = JSON.stringify(msgObj);
    
        for (var i=0;i<this.channels[channelId].length;i++){
            var sessionId = this.channels[channelId][i];
            if (this.sessions[sessionId]){
                this.sessions[sessionId].send(msg);
            } else {
                this.channels[channelId].splice(i,1);
                i--;
            }
        }
    }
};

SocketManager.prototype.on = function(methodName, closure){
    this.methods[methodName] = closure;
};

// Array IndexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, fromIndex) {
    if (fromIndex == null) {
        fromIndex = 0;
    } else if (fromIndex < 0) {
        fromIndex = Math.max(0, this.length + fromIndex);
    }
    for (var i = fromIndex, j = this.length; i < j; i++) {
        if (this[i] === obj)
            return i;
    }
    return -1;
  };
}

// Array Remove - By John Resig (MIT Licensed)
if (!Array.prototype.remove) {
  Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  };
}
