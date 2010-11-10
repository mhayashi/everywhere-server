var expatparser = require('./').parser;


//simple:
function simple()
{
 var parser=new expatparser(); // new instance of parser 
 parser.parser.parse( "<html><head><fb:media title=\"foo\" /></head><body bgcolor=\"#FFFFFF\">text</body>", false );

 console.log("print tree:");
 console.log(require('sys').inspect(parser.root,true,10));

 console.log("print selected tree, note how it takes on the parent:");
 console.log(require('sys').inspect(parser.root.html.body,true,10));
}

//simple:
function simple2()
{
  var parser = new expatparser(); // new instance of parser 
  //parser.parser.parse( "<html><body>aaa<a href=\"aaa\"></a>aaa<textarea></textarea></body></html>", false);
  parser.parser.parse( '<html><body>These domain names are reserved for use in documentation and are not available for registration. See <a href="javascript:void(0)" class="lwe-editable" title="Click to edit." lwe-href="javascript:void(0)">RFC2606</a>,<div></div></body></html>', false);

  console.log("print tree:");
  console.log(require('sys').inspect(parser.root,true,10));

  console.log("print selected tree, note how it takes on the parent:");
  console.log(require('sys').inspect(parser.root.html.body,true,10));
}

function testfile(file)
{
 require('fs').readFile(__dirname+'/'+file,'utf-8', function (err, data) {if (err) throw err;
 var parser=new expatparser(); // new instance of parser 
  parser.parse( data);
  console.log("print tree:");
  console.log(require('sys').inspect(parser.root,true,10));
 });
}

//testfile('test_data.html');

//testfile('test_data.xml');
//testfile('test_data_longer.xml');
//simple();
simple2();