var http = require('http'), 
		url = require('url'),
		fs = require('fs'),
		io = require('socket.io'),
		sys = require('sys'),
    sm = require('./socketmanager'),
    redis = require('redis'),
    site,
    ws,
    users = {},
    shared = {},
    development = false,
    jsdom  = require("jsdom"),
    window = jsdom.jsdom().createWindow(),
    html_sanitizer = require('./html-sanitizer'),
    html_sanitize = html_sanitizer.html_sanitize,
    exemptURLs = [
//   /http:\/\/www\.google\..*/,
//   /http:\/\/mail\.google\.com.*/,
//   /http:\/\/www\.twitter\.com$/
    ];
		
var send404 = function(res){
	res.writeHead(404);
	res.write('404');
	res.end();
};

site = http.createServer(function(req, res){
	var path = url.parse(req.url).pathname;
	switch (path){
	 case '/':
		fs.readFile(__dirname + '/index.html', function(err, data){
			if (err) return send404(res);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			res.end();
    });
		break;
	  // case '/about':
		//  fs.readFile(__dirname + '/about.html', function(err, data){
		//    if (err) return send404(res);
		//    res.writeHead(200, {'Content-Type': 'text/html'});
		//    res.write(data);
		//    res.end();
    //  });
		//  break;
	  // case '/contact':
		//  fs.readFile(__dirname + '/contact.html', function(err, data){
		//    if (err) return send404(res);
		//    res.writeHead(200, {'Content-Type': 'text/html'});
		//    res.write(data);
		//    res.end();
    //  });
		//  break;
	 case '/slide/20101020':
		fs.readFile(__dirname + '/slide/20101020.html', function(err, data){
			if (err) return send404(res);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			res.end();
    });
		break;
	 case '/client.crx?attredirects=0&d=1':
		fs.readFile(__dirname + path, function(err, data){
			if (err) return send404(res);
			res.writeHead(200, {'Content-Type': 'application/crx'});
			res.write(data);
			res.end();
		});
    break;
	default:
    if (/\.(js)$/.test(path)){
		  fs.readFile(__dirname + path, function(err, data){
			  res.writeHead(200, {'Content-Type': 'text/javascript'});
        res.write(data);
        res.end();
      });
    } else if (/\.(css)$/.test(path)) {
		  fs.readFile(__dirname + path, function(err, data){
        res.writeHead(200, {'Content-Type': 'text/css'});
        res.write(data);
        res.end();
      });
    } else if (/\.(jpg)$/.test(path)) {
		  fs.readFile(__dirname + path, function(err, data){
        res.writeHead(200, {'Content-Type': 'image/jpeg'});
        res.write(data);
        res.end();
      });
    } else if (/\.(png)$/.test(path)) {
		  fs.readFile(__dirname + path, function(err, data){
        res.writeHead(200, {'Content-Type': 'image/png'});
        res.write(data);
        res.end();
      });
    } else if (/\.(eot|woff|otf)$/.test(path)) {
		  fs.readFile(__dirname + path, function(err, data){
        res.writeHead(200);
        res.write(data);
        res.end();
      });
    } else {
      return send404(res);
    }
		break;
	}
});
site.listen(80);



// redis
var redis_client = redis.createClient();
redis_client.on('error', function(err) {
  console.log('Redis connection error to ' + redis_client.host + ':' + redis_client.port + ' - ' + err);
});


var sanitize = function(message, callback) {
  jsdom.jQueryify(window, __dirname + "/lib/jquery-1.4.2.min.js" , function() {
    var $ = window.jQuery;
    var old_value = $('<div>');
    old_value.html(message.old_value);
    var old_link = old_value.find('a');

    var new_value = $('<div>');
    new_value.html(message.new_value);
    new_value.find('a').each(function(i) {
      $(this).attr('lwe-href', $(old_link[i]).attr('lwe-href'));
    });

    function urlX(url) {
      if (/^javascript:void\(0\)/) {
        return url;
      }
    }
    
    callback(html_sanitize(new_value.html(), urlX));
  });
};

// websockets
ws = http.createServer(function(req, res){
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('');
});
ws.listen(8000);
io = io.listen(ws);
sm = new sm.SocketManager();
sm.register(io);

sm.on('join', function(client, message){
  // TODO: searching maybe costs a lot.
  var vurl = validateURL(message.url);
  if (development) console.log('join:'+vurl);
  if (vurl) {
    if (!sm.channels[vurl] || (sm.channels[vurl].indexOf(client.sessionId) === -1)) {
      sm.connectToChannel(client, vurl);
      users[client.sessionId] = { username: message.username,
                                  // realname: message.realname,
                                  // location: message.location,
                                  image_url: message.image_url };
      sendLog(client, message);
      sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
    } else {
      sendLog(client, message);
      sm.send('join', client.sessionId, { message: message });
    }
  }
});

sm.on('update', function(client, message){
  // when replying
  var vurl = validateURL(message.url);
  if (development) console.log('update:'+vurl);
  if (vurl) {
    if (message.message.match(/^@\w+ /)) {
      var src = RegExp.lastMatch;
      var replyTo = src.replace(/@/, '').replace(/ /, '');
      for (var sessionId in users) {
        if (development) console.log(sessionId);
        if (users.hasOwnProperty(sessionId)) {
          if (users[sessionId]['username'] === replyTo) {
            sm.send('update', client.sessionId, { message: message });
            sm.send('update', sessionId, { message: message });
            redis_client.rpush(vurl, JSON.stringify(message));
            break;
          }
        }
      }
    } else {
      sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
      redis_client.rpush(vurl, JSON.stringify(message));
      if (message.shortURL) {
        redis_client.set(vurl+':shorten', message.shortURL);
      }
    }
  }
});


function getSessionID(username) {
  for (var sessionId in users) {
    if (users.hasOwnProperty(sessionId)) {
      if (users[sessionId]['username'] === username) {
        return sessionId;
      }
    }
  }
}

function addShare(vurl, owner, username) {
  if (shared[vurl+owner]) {
    if (username) {
      var sessionID = getSessionID(username);
      shared[vurl+owner].push(sessionID);
    }
  } else {
    shared[vurl+owner] = [];
    shared[vurl+owner].push(owner);
    if (username) {
      shared[vurl+owner].push(username);
    }
  }
}

function removeShare(vurl, owner, username) {
  if (shared[vurl+owner]) {
    shared[vurl+owner].remove(username);
  }
}

sm.on('edit', function(client, message){
  // when replying
  var vurl = validateURL(message.url);
  if (development) console.log('edit:'+vurl);

  if (vurl) {
    sanitize(message.message, function(sanitized) {
      console.log(sanitized);
      message.message.new_value = sanitized;

      addShare(message.username);

      if (vurl === 'http://everywhere.no.de/demo') {
        sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
      } else {
        sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
        // for (var i = 0; i < shared[vurl+owner].length; i++ ) {
          
        //   sm.send('edit', client.sessionId, {message: { url: vurl,
        //                                                shortURL: null,
        //                                                log: null,
        //                                                users: _users }});
        //   sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
        // }
      }
      //redis_client.rpush(vurl+':edit:'+message.username, JSON.stringify(message));
    });
  }
});

sm.on('share', function(client, message){
  var vurl = validateURL(message.url);
  if (vurl) {
    shared[vurl+':'+message.username].push(message.message.username);
    if (message.message.status) {
      addShare(message.username, message.message.username);
    } else {
      removeShare(message.username, message.message.username);
    }
  }
});

sm.on('exit', function(client, message){
  var vurl = validateURL(message.url);
  if (vurl) {
    sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
    sm.exitFromChannel(client, vurl);
  }
});

function sendLog(client, message) {
  var _users = [];
  var vurl = validateURL(message.url);
  if (vurl) {
    if ((sm.channels[vurl]) && (sm.channels[vurl].length >= 1)) {
      //sys.debug(sm.channels[vurl]);
      for (var i = 0, len = sm.channels[vurl].length; i < len; i++) {
        var sessionId = sm.channels[vurl][i];
        //sys.debug(sessionId + ", " + users[sessionId]);
        if (sessionId) {
          var user = users[sessionId];
          if (user) {
            _users.push({ username: user.username, image_url: user.image_url, message: "" });
          }
        }
      }

      redis_client.llen(vurl, function(err, res) {
        if (res == 0) {
          sm.send('log', client.sessionId, {message: { url: vurl,
                                                       shortURL: null,
                                                       log: null,
                                                       users: _users }});
          return;
        }
        var loglen = res;
        var logstart = loglen>=10 ? loglen-10 : 0;
        redis_client.lrange(vurl, logstart, loglen-1, function(err, res) {
          //console.log(logstart + "~" + loglen + ":" + res);f
          var log = [];
          for (var i = 0, len = res.length; i < len; i++) {
            log.push(JSON.parse(""+res[i]));
          }

          redis_client.get(vurl+':shorten', function(err, res) {
            sm.send('log', client.sessionId, {message: { url: vurl,
                                                         shortURL: ""+res,
                                                         log: log,
                                                         users: _users }});
          });
        });
      });
    }
  }
}

function validateURL(url) {
  return checkURL(removeParams(url));
}

function checkURL(url) {
  if (url.match(/http:\/\/*\/*/)) {
    var len = exemptURLs.length;
    for (var i = 0; i < len; i++) {
      if (url.match(exemptURLs[i])) {
        return false;
      }
    }
    return url;
  }
  return false;
}

function removeParams(url) {
  var urlparts = url.split('#');
  if (urlparts.length>=2) {
    var urlparts2 = url.split('#!');
    if (urlparts2.length<=1) {
      url = urlparts[0];
    }
  }
//   urlparts = url.split('?');
//   if (urlparts.length>=2) {
//     /*
//     var prefix = encodeURIComponent(parameter) + '=';
//     var pars= urlparts[1].split(/[&;]/g);
//     for (var i = pars.length; i-->0;)
//       if (pars[i].lastIndexOf(prefix, 0) !== -1)
//         pars.splice(i, 1);
//     url = urlparts[0]+'?'+pars.join('&');
//     */
//     url = urlparts[0];
//   }
  return url;
};
