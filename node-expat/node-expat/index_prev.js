var expat = require('./build/default/node-expat');
this.sax=expat; 
// this is a very simple object parser 
// related link: stream parser: http://github.com/astro/node-xmpp/blob/master/lib/xmpp/connection.js
// related link: html parser:   http://github.com/bmeck/Witch/blob/master/parser/html/index.js

// usage
// var expat = require('./deps/node-expat');
//
// var parser=expat.parser(); // new instance of parser 
// parser.parser.parse( data, false ); 
// parser.root.children['html'][0].text
// parser.root.children['html'][0].children['body'].att['bgcolor'];
// parser.root.children['html'][0].children['head'][0].children['media'].att['title'];
// parser.root.children['html'][0].children['head'][0].nschildren['fb:media'].att['title'];
// 

// to use original expat you can do: 
// var expatsax=require('./deps/node-expat').sax;
// var parser= new expatsax.Parser(charset) and add the expat events i added below:
 

function parser(ignore_ns,charset)
{
 var self = this;
 self.addns=!!ignore_ns;
 self.onfinish=function () { };
  
 if(!charset)self.charset="UTF-8";
 function reset()
 {
  self.root=null;
  self.root=self.addns?{parent:null,children:[],attrs:[],nschildren:[],nsattrs:[]}: {parent:null,children:[],attrs:[]};
  self.ns={};
  self.element = null;
 }self.reset=reset;

 function removeparent() //this allows serializing.
 { 
  // after doind this , this onject probably can't parse anymore
  //tobedone
 }this.removeparent=removeparent;
 
 function xpath(element) //this allows search.
 {
  //tobedone
 }self.xpath=xpath;
 
 self.element = null;
 self.root=self.addns?{parent:false,children:[],att:[],nschildren:[],nsatt:[]}: {parent:null,children:[],att:[]};
 self.parser = new expat.Parser(self.charset);
 self.parser.addListener('startElement', function(name, attrs)
 {
  //first child might contain ns elements
  if (self.element===null)
  {
   self.ns = {};
   for(var k in attrs)
   {
    if(attrs.hasOwnProperty(key))
    {
     if (k == 'xmlns' || k.substr(0, 6) == 'xmlns:') self.ns[k] = attrs[k];
    }
   }
   self.element=self.root
  }

  var smicpos,nk;
  for(var k in attrs)
  {
   nk=k;
   if(attrs.hasOwnProperty(k))
   {
    smicpos=k.indexOf(':'); if(smicpos>0) nk=k.substring(smicpos+1,k.length);
    self.element.att[nk] = attrs[k];
    if(self.addns)self.element.nsatt[k] = attrs[k];
   }
  }
  
  nk=name;
  smicpos=name.indexOf(':'); if(smicpos>0) nk=name.substring(smicpos+1,k.length);
  
  
  var el=self.addns? {parent:null,children:[],att:[],nschildren:[],nsatt:[]} : {parent:null,children:[],att:[]};
  
  /*
  if(!self.element[name])self.element[name]={};
  if(self.addns) if(!self.element[name].nschildren)self.element[name].nschildren=[];
  if(self.addns) if(!self.element[name].nschildren)self.element[name].nschildren=[];
  
  console.log("nk="+require('sys').inspect(nk));
  console.log(require('sys').inspect(self.element));
  
  if(self.addns)self.element.nschildren[name].push(el);
  self.element.children[nk].push(el);  
  */
  self.element.children[nk]=el;
  self.element=el;
 });
 
 self.parser.addListener('endElement', function(name, attrs)
 {
  if (self.element.parent)
  {
   self.element=self.element.parent;
  }
  else if(self.onfinish)
  {
   self.onfinish();
  }
 });
 
 self.parser.addListener('text', function(str)
 {
  if (self.element) self.element.text=str;
 });
}; this.parser=parser;
