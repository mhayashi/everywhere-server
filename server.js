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
    sessionIDs = {},
    shared = {},
    development = true,
    jsdom  = require('jsdom'),
    window = jsdom.jsdom().createWindow(),
    jQuery,
    $,
    expatparser = require('node-expat').parser,
    html_sanitizer = require('./html-sanitizer'),
    html_sanitize = html_sanitizer.html_sanitize,
    // jQuery = require('./node-jquery'),
    // $ = jQuery,
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


// var G = {};
// var Script = process.binding('evals').Script;
// var scriptObj = new Script('', './lib/jquery.diff.js');
// scriptObj.runInThisContext();
// console.log(G);

site = http.createServer(function(req, res){
	var path = url.parse(req.url).pathname;
	switch (path){
	 case '/':
    var lang = null, html = '/index.html';
    // console.log(sys.inspect(req.headers, true, 10));
    lang = req.headers['accept-language'];
    lang = lang.split(';', 1)[0];
    lang = lang.split(',', 1)[0];
    //console.log(lang);
    if (lang === 'ja') html = '/index_ja.html';
		fs.readFile(__dirname + html, function(err, data){
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
	 case '/slide':
		fs.readFile(__dirname + '/slide/20101110.html', function(err, data){
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

var getEachEdit = function(key) {
  return function(callback){
    var result = key.split('|');
    var vurl = result[0];
    var owner = result[1];
    redis_client.hgetall(key, function(err, res) {
      for (var sid in res) {
        res[sid] = ''+res[sid];
      }
      callback(owner, res);
    });
  };
};

var sendEdit = function(vurl, client) {
  redis_client.smembers(vurl+'|*edit*', function(err, res) {
    var edits = {};
    //console.log(res.length);
    var counter = 0;
    for (var i = 0, len = res.length; i < len; i++) {
      res[i] = ''+res[i];
      //console.log(res[i]);
      getEachEdit(res[i])(function(owner, edit) {
        edits[owner] = edit;
        counter++;
        if (counter >= res.length) {
          //console.log('send');
          sm.send('edits', client.sessionId, { message: { url: vurl,
                                                          edits: edits }});
        }
      });
    }
  });
};


jsdom.jQueryify(window, __dirname + "/lib/jquery-1.4.2.min.js", function() {
  jQuery = window.jQuery;
  $ = jQuery;
});

var script = window.document.createElement('script');

var sanitize = function(message, whole, callback) {
  // jsdom.jQueryify(window, __dirname + "/lib/jquery-1.4.2.min.js", function() {
  //   jQuery = window.jQuery;
  //   $ = jQuery;
  //console.log(sys.inspect(message, true, 10));

  function urlX(url) {
    if (/^javascript:void\(0\)/) {
      return url;
    }
  };
      
  // compare dom tree
  if (!whole) {
    var old_value = $('<div>');
    old_value.html(message.old_value);
    var new_value = $('<div>');
    new_value.html(message.new_value);

    // restore modified link for security
    var old_link = old_value.find('a');
    new_value.find('a').each(function(i) {
      $(this).attr('lwe-href', $(old_link[i]).attr('lwe-href'));
    });

    script.src = 'file://' + __dirname + '/lib/jquery.diff.js';
    script.onload = function() {
      if (this.readyState === 'complete') {
        //fn(window);
        var old_parser = new expatparser();
        old_parser.parser.parse('<html><body>'+message.old_value+'</body></html>', false);

        var new_parser = new expatparser();
        new_parser.parser.parse('<html><body>'+message.new_value+'</body></html>', false);

        //console.log('old----------------------------');
        //console.log(message.old_value);
        //console.log(sys.inspect(old_parser.root.html.body, true, 10));
        delete old_parser.root.html.body.length;
        
        //console.log('new----------------------------');
        //console.log(message.new_value);
        //console.log(sys.inspect(new_parser.root.html.body, true, 10));
        delete new_parser.root.html.body.length;

        //console.log('result----------------------------');
        var result = $.diff(old_parser.root.html.body,
                            new_parser.root.html.body);
        // var result = old_parser.root.html.body.equals(new_parser.root.html.body);
        //console.log(result);

        if ($.isEmptyObject(result.add) === false) {
          callback(null);
        }
        else {
          callback(html_sanitize(new_value.html(), urlX));
        }
      }
    };

  } else {
    callback(html_sanitize(message, urlX));
  }
  // });
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
  var vurl = validateURL(message.url);
  //if (development) console.log('join:'+vurl);
  if (vurl) {
    // TODO: searching maybe costs a lot.
    if (!sm.channels[vurl] || (sm.channels[vurl].indexOf(client.sessionId) === -1)) {
      sessionIDs[message.username] = client.sessionId;
      sm.connectToChannel(client, vurl);
      users[client.sessionId] = { username: message.username,
                                  image_url: message.image_url };
      sendLog(client, message);

      sendEdit(vurl, client);

      sm.broadcastToChannel(client, vurl, message.msgType, { message: message });
    }
    // rejoin
    else {
      sessionIDs[message.username] = client.sessionId;

      sendLog(client, message);

      sendEdit(vurl, client);

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

var getSessionID = function(username) {
  for (var sessionId in users) {
    if (users.hasOwnProperty(sessionId)) {
      if (users[sessionId]['username'] === username) {
        return sessionId;
      }
    }
  }
  return null;
};

var addShare = function(vurl, owner, coeditor) {
  if (shared[vurl+'|'+owner]) {
    if (coeditor) {
      var sessionID = getSessionID(coeditor);
      if (sessionID) {
        shared[vurl+'|'+owner].push(sessionID);
      }
    }
  } else {
    shared[vurl+'|'+owner] = [];
    shared[vurl+'|'+owner].push(owner);
    if (coeditor) {
      shared[vurl+'|'+owner].push(coeditor);
    }
  }
};

var removeShare = function(vurl, owner, username) {
  if (shared[vurl+'|'+owner]) {
    shared[vurl+'|'+owner].remove(username);
  }
};

var isMember = function(ch, username, cb) {
  redis_client.exists(ch+'|*members*', function(err, res) {
    if (!res) {
      cb && cb(false);
    }
    redis_client.hkeys(ch+'|*members*', function(err, res) {
      for (var i = 0, len = res.length; i < len; i++) {
        if (res[i] === username)
          cb && cb(true);
      }
      cb && cb(false);
    });
  });
};

var sendMembers = function(client, message) {
  var vurl = validateURL(message.url);
  var ch = vurl + '|' + message.message.owner;

  if (!vurl) return;

  redis_client.exists(ch+'|*members*', function(err, res) {
    if (!res) return;
    
    redis_client.hkeys(ch+'|*members*', function(err, res) {
      var _users = [];
      // connect to channel(for edit) when the user revisit
      for (var i = 0, len = res.length; i < len; i++) {
        _users.push(''+res[i]);

        if (!sm.channels[ch] || (sm.channels[ch].indexOf(client.sessionId) === -1)) {
          sm.connectToChannel(client, ch);
        }
      }
      if (development) console.log(_users);
      
      sm.send('share',
              client.sessionId,
              { message: { url: vurl,
                           shortURL: null,
                           message: { command: 'members',
                                      owner: message.message.owner,
                                      users: _users }}});
    });
  });
};


sm.on('edit', function(client, message){
  // when replying
  var vurl = validateURL(message.url);
  if (vurl) {

    var ch = vurl + '|' + message.message.owner;
    
    if (development) console.log(message.message.type, sys.inspect(message.message, true, 10));
    
    switch(message.message.type) {

     case 'delete':
      if (message.username === message.message.owner) {
        // console.log('delete', ch);
        redis_client.del(ch);
        redis_client.srem(vurl+'|*edit*', ch);
      }
      break;
      
     case 'whole':

      $.each(message.message.data, function(uid, value) {
        sanitize(value, true, function(sanitized) {
          if (development) console.log(sanitized);
          if (sanitized) {
            // console.log(ch, uid, sanitized);
            redis_client.hset(ch, uid, sanitized);
            redis_client.sadd(vurl+'|*edit*', ch);
          }
        });
      });
      
      break;
      
    default:

      // if (development) console.log('edit:', ch);
      // if (development) console.log(sys.inspect(message, true, 10));

      sanitize(message.message, false, function(sanitized) {
        if (sanitized) {

          if (development) console.log('sanitized', sanitized);
          
          message.message.new_value = sanitized;

          sm.broadcastToChannel(client, ch, message.msgType, { message: message });
          sm.send('edit', client.sessionId, { message: message });

          console.log(ch);
          redis_client.hset(ch, message.message.uid, message.message.new_value);
          redis_client.sadd(vurl+'|*edit*', ch);
        }
      });
      
      break;
    }
  }
 
});

sm.on('share', function(client, message){
  var vurl = validateURL(message.url);
  if (vurl) {
    var ch = vurl + '|' + message.message.owner;
    // if (development) console.log('share:'+ch);
    // if (development) console.log(sys.inspect(message, true, 10));

    // Add the client to the channel if the channel hasn't open or the client hasn't join the channel
    var addToChannel = function() {
      if (!sm.channels[ch] || (sm.channels[ch].indexOf(client.sessionId) === -1)) {
        sm.connectToChannel(client, ch);
        redis_client.hset(ch+'|*members*', message.username, true);
      }
    };

    if (message.username === message.message.owner) {
      addToChannel();
    }
    
    if (development)
      console.log(ch, sm.channels[ch], 'share', message.message.command, message.message.coeditor, sessionIDs[message.message.coeditor]);
    
    switch (message.message.command) {
      // get members list
      case 'members':
      sendMembers(client, message);
      break;

      // the client invite others
      case 'invite':
      isMember(ch, message.message.coeditor, function(res) {
        console.log(res);
        if (!res)
          sm.send('share', sessionIDs[message.message.coeditor], { message: message });
      });
      break;

      // the client approved to join the channel
      case 'join':
      addToChannel();
      sm.broadcastToChannel(client, ch, message.msgType, { message: message });
      break;

      // the client don't approved to join the channel
      case 'deny':
      sm.exitFromChannel(client, ch);
      sm.broadcastToChannel(client, ch, message.msgType, { message: message });
      break;
      
      // the client kicked out the other co-editor from the channel
      case 'kick':
      var coeditorID = getSessionID(message.message.coeditor);
      // TODO need client id
      //sm.exitFromChannel(coeditorID, ch);
      sm.broadcastToChannel(client, ch, message.msgType, { message: message });
      break;

      default:
      break;
    }
    // // re-share
    // else {
    //   sm.send('share', client.sessionId, { message: message });
    // }
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

      redis_client.exists(vurl, function(err, res) {

        if (!res){
          sm.send('log', client.sessionId, {message: { url: vurl,
                                                       shortURL: null,
                                                       log: null,
                                                       users: _users }});
          return;
        }
        
        redis_client.llen(vurl, function(err, res) {

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

// remove parameter from url
//function removeParams(url, parameter) {
function removeParams(url) {
  var urlparts = url.split('#');
  if (urlparts.length>=2) {
    var urlparts2 = url.split('#!');
    if (urlparts2.length<=1) {
      url = urlparts[0];
    }
  }
  //TODO it might be unecessary. chrome automatically add '/' to some url.
  //url = url.replace(/\/$/, '');
  
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

