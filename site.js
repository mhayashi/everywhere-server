var http = require('http'), 
		url = require('url'),
		fs = require('fs'),
		sys = require('sys'),
    redis = require('redis'),
    server;
		
var send404 = function(res){
	res.writeHead(404);
	res.write('404');
	res.end();
};

console.log('server start');
server = http.createServer(function(req, res){
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
        res.writeHead(200, {'Content-Type': 'image/css'});
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

server.listen(80);

