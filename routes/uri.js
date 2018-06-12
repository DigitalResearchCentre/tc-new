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
              console.log(detparts[1]);
              res.send(" text found: "+detparts[1]);
            } else if (detparts[1].indexOf("entity=")!=-1) {
              entityRequest(req, res, community.entities, detparts[1], entityparts, 0, authparts[4], function(err, foundEntity) {
                if (!err) res.json(foundEntity);
              });
            } else if (detparts[1].indexOf("document=")!=-1) {
              docRequest(req, res, community.documents, detparts[1], docparts, 0, function(err, foundDoc) {
                var children=[];
                if (err) {next(err)} else {
                  //ok. what are we returning. If it is a page, we are currently supporting xml and a full html page
                  if (req.query.type=="transcript" && (foundDoc.label=="pb" || foundDoc.label=="lb" || foundDoc.label=="cb" )){
                    Doc.getTexts(foundDoc._id, function(err, texts) {
                      if (err) { next(err)} else {
                        if (req.query.format=="xml") {
                          res.send(formatXML(texts, true));
                        } else if (req.query.format=="html") {
                          var xml=formatXML(texts, false);
                          res.render('dettranscript.ejs', { source: formatHTML(xml), url: config.host_url});
                        } else { //deal with images, or whatevs
                          var key, result="?";
                          for (key in req.query) { if (req.query.hasOwnProperty(key)) {result+=key + "=" + req.query[key]+"&";}}; result=result.slice(0, -1);
                          res.status(400).json({error: "Cannot deal with request query '"+result+"'"})
                        }
                      }
                    });
                  } else res.json({name:foundDoc.name, label:foundDoc.label, nparts: foundDoc.children.length, hasImage: foundDoc.hasOwnProperty("image")});
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

function entityRequest(req, res, entities, name, entityparts, i, community, callback) {
  if (entityparts[i].value=="*") { //wild card for docs at this level
    if (entityparts[i].property=="*"|| (i==0 && entityparts[i].property=="entity")) {
      async.mapSeries(entities, function(myEntity, cb){ //how many children does each one have
        var thisEntityProperty=myEntity.entityName.slice(myEntity.entityName.lastIndexOf(":")+1,myEntity.entityName.lastIndexOf("="));
        Entity.find({ancestorName:myEntity.entityName}, function(err, myentities){
          cb(err, {name:myEntity.name, label:thisEntityProperty, nparts: myentities.length})
        });
      }, function (err, results) {
  //      console.log(results);
        if (!err) res.json(results);
        else res.send(err);
      })
    } else {//find by property value
      //no need to search for entities, we got them already...just return the entities matching this property value
      async.mapSeries(entities, function(myEntity, cb) {
        var thisEntityProperty=myEntity.entityName.slice(myEntity.entityName.lastIndexOf(":")+1,myEntity.entityName.lastIndexOf("="));
        if (thisEntityProperty==entityparts[i].property) {
          Entity.find({ancestorName:myEntity.entityName}, function(err, myentities){
            cb(err, {name:myEntity.name, label:thisEntityProperty, nparts: myentities.length})
          });
        } else cb(null, null);
      }, function (err, results) {
          for (var j=0; j<results.length; j++){ if (!results[j]) results.splice(j--,1)};
          if (!err) res.json(results);
          else res.send(err);
      });
    }
  } else {//recurse till we hit end, or hit *
    //construct the entity name to this point..are we matching up to now?

    var thisEnt=community;
    var foundEnt=false;
    for (var k=0; k<entityparts.length && k<=i; k++) {thisEnt+=":"+entityparts[k].property+"="+entityparts[k].value}
    for (var j=0; j<entities.length; j++) {
      //have to ensure we have match of full entity name. Either, matching whole string, or matching includes following :
      if (thisEnt==entities[j].entityName || thisEnt+":"==entities[j].entityName.slice(0, thisEnt.length+1)) {
        //we match!
        foundEnt=true;
          if (i==entityparts.length-1) {//the one we wanted..
          var thisEntityProperty=entities[j].entityName.slice(entities[j].entityName.lastIndexOf(":")+1, entities[j].entityName.lastIndexOf("="));
          if (!entities[j].isTerminal) {
            var thisEntity=entities[j];
            Entity.find({ancestorName: thisEntity.entityName}, function(err, myentities){
              callback(err, {name: thisEntity.name, nparts:myentities.length, ancestorName: ("ancestorName" in entities[j])?thisEntity.ancestorName:"", entityName:thisEntity.entityName, label:thisEntityProperty});
            });
          }
          else callback(null, {name: entities[j].name, nparts:0, ancestorName: ("ancestorName" in entities[j])?entities[j].ancestorName:"", entityName:entities[j].entityName, label:thisEntityProperty});
        } else { //go round again
            //but... only go if this entity has children... else error
            Entity.find({ancestorName:thisEnt}, function(err, myentities){
              if (myentities.length==0) {
                res.status(400).send('Found "'+thisEnt+'" as part of "'+name+'", but this has no children');
              } else {
                entityRequest(req, res, myentities, name, entityparts, i+1, community, callback);
              }
            });
        }
      }
    } //if we got here, no match!
    if (!foundEnt) res.status(400).send("Cannot find "+name);
  }
};

function docRequest(req, res, documents, name, docparts, i, callback) {
  if (docparts[i].value=="*") { //wild card for docs at this level
    if (docparts[i].property=="*" || (i==0 && docparts[i].property=="document")) {
      var foundline=0;
      async.mapSeries(documents, function(myDoc, cb){
        Doc.findOne({_id: myDoc}, function (err, thisDoc){
          if (!thisDoc.hasOwnProperty('name') && thisDoc.label=="lb") {
            foundline++;
            cb(err, {name: foundline, nparts: thisDoc.children.length, label:thisDoc.label,hasImage: thisDoc.hasOwnProperty("image")});
          }
          else cb(err, {name: thisDoc.name, nParts: thisDoc.children.length, label:thisDoc.label, hasImage: thisDoc.hasOwnProperty("image")});
        })
      }, function (err, results){
        if (!err) res.json(results);
        else res.send(err);
      });
    } else { //we have a defined property. Filter documents by property name
      var foundline=0;
      async.mapSeries(documents, function(myDoc, cb){
        Doc.findOne({_id: myDoc, label:docparts[i].property}, function (err, thisDoc){
          if (thisDoc) {
            if (docparts[i].property=="lb" && !thisDoc.hasOwnProperty('name')) {
              foundline++;
              cb(err, {name: foundline, nparts: thisDoc.children.length, label:thisDoc.label, hasImage: thisDoc.hasOwnProperty("image")});
            } else cb(err, {name: thisDoc.name, nparts: thisDoc.children.length, label:thisDoc.label, hasImage: thisDoc.hasOwnProperty("image") });
          } else cb(err, null)
        });
      }, function (err, results) {
        //remove non-matching pages
        for (var i=0; i<results.length; i++){ if (!results[i]) results.splice(i--,1)};
        if (!err) res.json(results);
        else res.send(err);
      });
    }
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
            foundDoc.name=""+foundline;
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
