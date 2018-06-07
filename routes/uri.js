var _ = require('lodash')
  , ejs = require('ejs')
  , fs = require('fs')
  , path = require('path')
  , crypto = require('crypto')
  , async = require('async')
  , express = require('express')
  , multer = require('multer')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , TCMailer = require('../localmailer')
  , mongoose = require('mongoose')
  , config = require('../config')
  , gridfs = require('../utils/gridfs')
  , libxml = require('libxmljs')
  , Community = models.Community
  , Action = models.Action
  , User = models.User
  , Doc = models.Doc
  , Collation = models.Collation
  , Entity = models.Entity
  , Revision = models.Revision
  , TEI = models.TEI
  , RESTError = require('./resterror')
  , ObjectId = mongoose.Types.ObjectId
  , FunctionService = require('../services/functions')
  , config=require('../config')
;

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

router.use(function(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept, Key, Cache-Control',
  });
  next();
});


router.get('**', function(req, res, next) {
  //ok, what do we have...
  var detparts=req.params[0].slice(1).split("/");
  var authparts=detparts[0].split(":");
  var nameparts=detparts[1].split(":");
  var entityparts=[];
  var docparts=[];
  var inentity=false;
  var indoc=false;
  var errfound=false;
  if (authparts[0]!='urn') res.status(400).send('URI protocol "'+authparts[0]+'" not recognized. "urn" expected');
  else if (authparts[1]!='det') res.status(400).send('URN Namespace Identifier "'+authparts[1]+'" not recognized. "det" expected');
  else if (authparts[2]!='tc') res.status(400).send('URN det naming authority prefix "'+authparts[2]+'" not recognized. "tc" expected');
  else if (authparts[3]!='usask') res.status(400).send('URN det naming authority organization "'+authparts[3]+'" not recognized. "usask" expected');
  else {
    //check validity of property value string
    for (var i=0; i<nameparts.length; i++) {
      var bits=nameparts[i].split("=");
      if (bits.length==1) {
        errfound=true;
        res.json({error:"Error in det name string: property name and value should be in 'property=value' form", "errorstring": nameparts[i]});
        i=nameparts.length;
      } else {
        if (bits[0]=="entity") {inentity=true; indoc=false};
        if (bits[0]=="document") {inentity=false; indoc=true};
        if (inentity) entityparts.push({property:bits[0], value:bits[1]})
        if (indoc) docparts.push({property:bits[0], value:bits[1]})
      }
    }
    if (!errfound) {
    //ok so far.. now, is this a public community?
    // we coujld be asking for all communities,in which case community is *
      if (authparts[4]=="*") {
          Community.find({public:true}, function(err, communities){
            var mycommunities=[];
            communities.forEach(function(community){ mycommunities.push({community:community.name})});
            res.json(mycommunities);
          });
      } else {
//        console.log(authparts[4]);
        Community.findOne({abbr:authparts[4], public:true}, function(err, community){
  //        console.log(community)
          if (!community) res.status(400).send('The community "'+authparts[4]+'" is not known on this Textual Communities server, or is not publicly available.');
          else { //fun starts! we got a community. Now, what do we have??? are we looking for just entity, just document, or text
            //ok.. we have only entity search, document search, or text search
            if (detparts[1].indexOf("entity=")!=-1 && detparts[1].indexOf("document=")!=-1) {
              res.send(" text found: "+detparts[1]);
            } else if (detparts[1].indexOf("entity=")!=-1) {

              res.send(" entity found: "+detparts[1]);
            } else if (detparts[1].indexOf("document=")!=-1) {
              docRequest(req, res, community.documents, detparts[1], docparts, 0, function(err, foundDoc) {
                var children=[];
                if (err) {next(err)} else {
                  //ok. what are we returning. If it is a page, we are currently supporting xml and a full html page
                  if (foundDoc.label=="pb") {
                    Doc.getTexts(foundDoc._id, function(err, texts) {
                      if (err) { next(err)} else {
                        if (req.query.type=="transcript" && req.query.format=="xml") {
                          res.send(formatXML(texts, true));
                        } else if (req.query.type=="transcript" && req.query.format=="html") {
                          var xml=formatXML(texts, false);
                          res.render('dettranscript.ejs', { source: formatHTML(xml), url: config.host_url});
                        } else { //deal with images, or whatevs
                          var key, result="?";
                          for (key in req.query) { if (req.query.hasOwnProperty(key)) {result+=key + "=" + req.query[key]+"&";}}; result=result.slice(0, -1);
                          res.status(400).send('Cannot deal with request query "'+result+'"')
                        }
                      }
                    });
                  } else res.json(foundDoc);
                }
              })
            }
            else res.send("entity and/or document declaration required by det urn syntax "+detparts[1]);
          }
        });
      }
    }
  }
});

function formatHTML(xml) {
  var p4=xml;
  p4=p4.replace(/<head/g, "<h3");
	p4=p4.replace(/<\/head/g, "</h3");
	p4=p4.replace(/<row/g, "<tr");
	p4=p4.replace(/<\/row/g, "</tr");
	p4=p4.replace(/<cell/g, "<td");
	p4=p4.replace(/<\/cell/g, "</td");
  p4=p4.replace(/ rend=/g, " class=");
  p4=p4.replace("<text>", "");
  p4=p4.replace("</text>", "");
  p4=p4.replace("<body>", "");
  p4=p4.replace("</body>", "");
  return(p4);
}

function formatXML(texts, isXML) {
  var nodes = JSON.parse(JSON.stringify(texts))
    , nodesMap = {}
    , root
  ;
  _.each(nodes, function(node) {
    node._children = _.map(node.children, function(childId) {
           return childId;
     });
     nodesMap[node._id] = node;
  });
  _.each(nodesMap, function(node) {
    if (_.isEmpty(node.ancestors)) {
      root = node;
  //                            console.log(root);
    } else {
      var children = nodesMap[_.last(node.ancestors)].children;
      var index = children.indexOf(node._id);
      if (index > -1) {
        children.splice(index, 1, node);
      }
    }
  });
  _.each(nodesMap, function(node) {
    node.children = _.filter(node.children, function(child) {
      return !!child._id;
    });
  });
  var myPage= json2xmlDoc(root).children[0].outerHTML.normalize();
  myPage=myPage.replace(/\n/g, "");
  if (isXML)  myPage=myPage.replace(/><\/pb>/g, "/>").replace(/><\/lb>/g, "/>").replace(/><\/cb>/g, "/>").replace(/><\/gap>/g, "/>");
  return(myPage);
}

function docRequest(req, res, documents, name, docparts, i, callback) {
  if (docparts[i].value=="*") { //wild card for docs at this level
    var foundline=0;
    async.mapSeries(documents, function(myDoc, cb){
      Doc.findOne({_id: myDoc}, function (err, thisDoc){
        if (!thisDoc.hasOwnProperty('name') && thisDoc.label=="lb") {
          foundline++;
          cb(err, {name: foundline, nparts: thisDoc.children.length });
        }
        else cb(err, {name: thisDoc.name, nparts: thisDoc.children.length });
      })
    }, function (err, results){
      if (!err) res.json(results);
      else res.send(err);
    });
  }
  else {
    var foundDoc={};
    //special case: lb elements are not given explicit names
    var foundline=0;
    async.mapSeries(documents, function(myDoc, cb){
      Doc.findOne({_id: myDoc}, function (err, thisDoc){ //we may not number line breaks explicitly
        if (!thisDoc.hasOwnProperty('name') && thisDoc.label=="lb") {
          foundline++;
//          console.log("looking for the line")
          if (foundline==docparts[i].value) {
//            console.log("got the line?")
            foundDoc=thisDoc;
            cb("found document");
          } else cb(err);
        }
        else if (thisDoc.name==docparts[i].value) {
          foundDoc=thisDoc
          cb("found document");
        }
        else cb(err);
      })
    }, function (err) {
      if (err=="found document") {
        if (i==docparts.length-1) {
          callback(null, foundDoc);
        } else {//recurse...
          //but if we don't have children, and we are looking for a child..death
          if (foundDoc.children.length==0) {
            res.status(400).send("Cannot find "+name);
          }
          else
          docRequest(req, res, foundDoc.children, name, docparts, i+1, callback);
        }
      } else {
        res.status(400).send("Cannot find "+name);
      }
    });
  }
  //ok, we are asking for a document..
  //first, could be we are looking for all the documents, or all the parts of one part of a document

}



function json2xmlDoc(obj) {
  const { document } = (new JSDOM(`...`)).window;
  var xmlDoc = document.implementation.createDocument('', '', null)
    , queue = []
  ;
  loadObjTree(xmlDoc, xmlDoc, obj, queue);
  while (queue.length > 0) {
    var item = queue.shift()
      , parentEl = item.parent
      , child = item.child
    ;
    loadObjTree(xmlDoc, parentEl, child, queue);
  }
  return xmlDoc;
}

function loadObjTree(xmlDoc, parentEl, obj, queue) {
  var childEl;
  if (!obj) {
    return
  }
  if (obj.name === '#text') {
    childEl = xmlDoc.createTextNode(obj.text);
  } else if (obj.name === '#comment') {
    childEl = xmlDoc.createComment(obj.text || '');
  } else {
    childEl = xmlDoc.createElement(obj.name);
    _.each(obj.attrs, function(v, k) {
      childEl.setAttribute(k, v);
    });
    _.each(obj.children, function(child) {
      if (!_.isString(child)) {
        queue.push({parent: childEl, child: child});
      }
    });
  }
  parentEl.appendChild(childEl);
}


module.exports = router;
