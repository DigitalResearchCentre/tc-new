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
  , Entity = models.Entity
  , Revision = models.Revision
  , TEI = models.TEI
  , RESTError = require('./resterror')
  , ObjectId = mongoose.Types.ObjectId
;

router.use(function(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept, Key, Cache-Control',
  });
  next();
});

router.use('/docs', require('./doc'));

var CommunityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Community, opts);
}, {
  execSave: function(req, res, next) {
    return function(obj, cb) {
      obj.save(function(err, obj, numberAffected) {
        if (!err && req.body.dtd) {
          obj.setDTD(req.body.dtd);
        }
        return cb(err, obj);
      });
    };
  },
  afterCreate: function(req, res, next) {
    return function(community, cb) {
      var  user = req.user;
      user.memberships.push({
        community: community._id,
        role: User.CREATOR,
      });
      user.save(function(err, user) {
        cb(err, community);
      });
    };
  }
});
new CommunityResource({id: 'community'}).serve(router, 'communities');
router.get('/communities/:id/memberships/', function(req, res, next) {
  User.find({
    memberships: {
      $elemMatch: {community: req.params.id},
    },
  }).exec(function(err, users) {
    if (err) {
      next(err);
    } else {
      res.json(users);
    }
  });
});

router.put('/communities/:id/add-member', function(req, res, next) {
  var communityId = req.params.id
    , userId = req.body.user
    , role = req.body.role
    , community
  ;
  async.parallel([
    function(cb) {
      Community.findOne({_id: communityId}).exec(cb);
    },
    function(cb) {
      User.findOne({_id: userId}).exec(cb);
    },
  ], function(err, results) {
    if (err) {
      next(err);
    } else {
      var community = results[0]
        , user = results[1]
      ;
      user.memberships.push({
        community: community._id,
        role: role,
      });
      user.save(function(err, user) {
        if (err) {
          return next(err);
        }
        res.json(user);
      });
    }
  });
});

var RevisionResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Revision, opts);
}, {
  beforeCreate: function(req, res, next) {
    var obj = new this.model(req.body);
//    console.log(req.body);
    if (!obj.user) {
      obj.user = req.user;
    }
    return function(cb) {
      return cb(null, obj);
    };
  },
  afterCreate: function(req, res, next) {
    return function(revision, cb) {
      Revision.findOne({_id: revision._id}).populate('user').exec(cb);
    };
  }
});
var revisionResource = new RevisionResource({id: 'revision'});
revisionResource.serve(router, 'revisions');



var EntityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Entity, opts);
});


var entityResource = new EntityResource({id: 'entity'});
entityResource.serve(router, 'entities');
router.get('/entities/:id/docs/:docId', function(req, res, next) {
  var docId = req.params.docId
    , entityId = req.params.id
  ;
  Entity.getDocs(entityId, docId, function(err, docs) {
    if (err) {
      return next(err);
    }
    res.json(docs);
  });
});

var userResource = new Resource(User, {id: 'user'});
userResource.serve(router, 'users');


function confirmMembership(action) {
  var payload = action.payload
    , user = payload.user
    , community = payload.community
    , role = payload.role
    , hash = payload.hash
  ;
}

function requestMembership(action, callback) {
  var buf = crypto.randomBytes(64)
    , payload = action.payload
  ;
  payload.hash = buf.toString('hex');
  async.parallel([
    function(cb) {
      User.findOne({_id: payload.user}, cb);
    },
    function(cb) {
      Community.findOne({_id: payload.community}, cb);
    },
    function(cb) {
      User.find({
        'memberships.community': payload.community,
        'memberships.role': User.CREATOR,
      }, cb);
    },
    function(cb) {
      new Action(action).save(function(err, obj) {
        cb(err, obj);
      });
    },
  ], function(err, results) {
    var user = results[0]
      , community = results[1]
      , leader = results[2][0]
      , action = results[3]
      , message
    ;
    if (!err) {
      message = ejs.render(
      fs.readFileSync(
        __dirname + '/../views/joinletternotifyleader.ejs', 'utf8'),
        {
          username: user.local.name,
          hash: action.payload.hash,
          url: `${config.BACKEND_URL}actions/${action._id}`,
          communityemail: leader.email,
          useremail: user.local.email,
          communityname: community.name,
          communityowner: leader.name
        }
      );
      TCMailer.localmailer.sendMail({
        from: TCMailer.addresses.from,
        to: leader.local.email,
        subject: `
          Application from ${user.local.name} to join Textual Community`,
        html: message,
        text: message.replace(/<[^>]*>/g, '')
      });
      var obj = action.toObject();
      delete obj.payload.hash;
      callback(err, obj);
    } else {
      callback(err);
    }
  });
}

function validateAction(action) {
  return action.type && action.payload;
}

router.get('/actions/:id', function(req, res, next) {
  Action.findOne({_id: req.params.id}, function(err, action) {
    var payload = action.payload
      , role = payload.role
    ;
    if (payload.hash && payload.hash === req.query.hash) {
      async.parallel([
        function(cb) {
          User.findOne({_id: payload.user}, cb);
        },
        function(cb) {
          Community.findOne({_id: payload.community}, cb);
        },
      ], function(err, results) {
        var user = results[0]
          , community = results[1]
        ;
        user.memberships.push({
          community: community._id,
          role: role,
        });
        async.parallel([
          function(cb) {
            user.save(function(err, obj) {
              cb(err, obj);
            });
          },
          function(cb) {
            payload.hash = '';
            action.save(function(err, obj) {
              cb(err, obj);
            });
          },
        ], function(err) {
          if (err) {
            next(err);
          } else {
            res.redirect('/app');
          }
        });
      });
    } else {
      res.json({message: 'invalid hash'});
    }
  });
});

router.post('/actions', function(req, res, next) {
  var action = req.body;
//  console.log(action);
  if (!validateAction(action)) {
    return next({error: 'Action format error'});
  }
  switch (action.type) {
    case 'request-membership':
      requestMembership(action, function(err, _action) {
//      console.log('requestMembership finish');
//        console.log(err);
        if (err) {
          next(err);
        } else {
          res.json(_action);
        }
      });
      break;
    default:
      next({error: 'action not found'});
  }
});


router.get('/auth', function(req, res, next) {
  if (req.isAuthenticated()) {
    req.params.user = req.user._id;
    next();
  } else {
    res.json({});
  }
}, userResource.detail());



var upload = multer({
  storage: gridfs,
});
router.post('/upload', upload.any(), function(req, res, next) {
//  console.log(req.files);
  res.json(req.files);
});

router.get('/gridfs/:id',  function(req, res, next) {
  gridfs.gfs.findOne({ _id: req.params.id }, function(err, file) {
    if (err || !file) {
      return next(err, file);
    }
    res.set('Content-Length', file.length);
    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'inline; filename="' + file.filename + '"');
    gridfs.gfs.createReadStream({
      _id: req.params.id,
    }).pipe(res);
  })
});

router.post('/sendmail', function(req, res, next) {
  TCMailer.localmailer.sendMail(req.body, function(err, status) {
    if (!err) {
      res.json(status);
    } else {
      next(err);
    }
  });
});

router.post('/getSubEntities', function(req, res, next) {
//  console.log("looking for entities with ancestor "+req.query.ancestor)
  var foundEntities=[];
  Entity.find({"ancestorName":req.query.ancestor}, function(err, children) {
    foundEntities=children;
    res.json({foundEntities});
  });
});

router.post('/getEntities', function(req, res, next) {
  var foundEntities=[];
  Community.findOne({abbr: req.query.community}, function(err, community) {
    if (community) {
      for (var i=0; i<community.entities.length; i++) {
        foundEntities.push({"attrs":{"name":community.entities[i].name, "isTerminal":community.entities[i].isTerminal, "entityName": community.entities[i].entityName}});
      }
        res.json({foundEntities});
    }
  });
});

router.post('/getDocEntities', function(req, res, next) {
  var foundDocEntities=[];
  Doc.findOne({_id: req.query.document}, function(err, document) {
    if (document) {
      for (var i=0; i<document.entities.length; i++) {
//        console.log(document);
        foundDocEntities.push({"name":document.entities[i].name, "isTerminal":document.entities[i].isTerminal, "entityName": document.entities[i].entityName, "entityChildren": document.entities[i].entityChildren, "tei_id": document.entities[i].tei_id});
      }
        res.json({foundDocEntities});
    }
  });
});



router.post('/getEntityVersions', function(req, res, next) {
//  console.log("looking for versions of identifier "+req.query.id)
  var foundVersions=[];
  TEI.find({"entityName":req.query.id}, function(err, versions) {
    var nversions=versions.length;
    var nprocessed=0;
    async.forEachOf(versions, function(version) {
      const cb2 = _.last(arguments);
      async.waterfall([
        function(callback) {
         Doc.findOne({_id:version.docs[0]}, function (err, myDoc) {
            callback(err, myDoc);
          });
        },
        function(myDoc, callback) {
          //use async recursive to pull these together
          var teiContent={"content":""};
          loadTEIContent(version, teiContent).then(function (){
            nprocessed++;
            foundVersions.push({"sigil":myDoc.name, "version":teiContent.content})
            if (nprocessed==nversions) res.json({foundVersions});
          });
        },
      ])
    });
  });
});

function procTEIs (teiID, callback) {
    TEI.findOne({_id:teiID}, function (err, version) {
      var tei={"content":""};
      loadTEIContent(version, tei).then(function (){
        //might here have to wrap element content in xml stuff?
        //test: is this an element...if it is, bookend with xml
        //when preparing for collation .. drop note elements here
        if (version.children.length && version.name!="#text") {
          var attrs="";
          if (version.attrs) {
            for (var key in version.attrs) {
              attrs+=" "+key+"=\""+version.attrs[key]+"\"";
            }
          }
          tei.content="<"+version.name+attrs+">"+tei.content+"</"+version.name+">";
        }
//        console.log("adding the tei "+tei.content)
        callback(err, tei.content);
      });
    });
}

function loadTEIContent(version, content) {
  var deferred = Promise.defer();
  if (version.children.length) {
    async.map(version.children, procTEIs, function (err, results) {
        var newContent="";
        for (var i=0; i<results.length; i++) {newContent+=results[i];}
        content.content=newContent;
        deferred.resolve();
    })
  } else { //only one! add this to the tei
      if (version.name=="#text") {
        content.content+=version.text;
      } else {
        //no content, but an element -- pb or lb or similar, ignore
      }
      deferred.resolve();
  }
  return deferred.promise;
}


router.post('/getSubDocEntities', function(req, res, next) {
//    console.log("looking for "+req.query.id);
    TEI.findOne({_id: req.query.id}, function(err, tei) {
//      console.log("error "+err);
//      console.log("tei "+tei);
      var foundTEIS=[];
      var hits=0;
      for (var i=0; i<tei.entityChildren.length; i++) {
          var thisTeiId=tei.entityChildren[i];
          TEI.findOne({_id: tei.entityChildren[i]}, function(err, oneTEI) {
            var hasChild=true;
            hits++;
            if (oneTEI.entityChildren.length==0) hasChild=false;
            foundTEIS.push({"name":oneTEI.attrs.n, "tei_id":oneTEI._id, "hasChild":hasChild, "page":oneTEI.docs[1]});
            if (hits==tei.entityChildren.length) {
              res.json({foundTEIS});
            }
        });
      }

    });
});

//use this to remove temp div and p placed outside pb elements, before inserting new text from template
router.post('/zeroDocument', function(req, res, next) {
  var docroot=req.query.id;
  //should check that no pbs have any teis below them..
  var deleteTeis=[];
  async.waterfall([
      function(cb) {
        TEI.findOne({docs: ObjectId(docroot), name:"pb"}, function(err, pbel){
          var firstAnc=pbel.ancestors[pbel.ancestors.length-1];
          deleteTeis=pbel.ancestors.slice(1);
          cb(null, firstAnc);
        })
      },
      function(firstAnc, cb) {
        TEI.findOne({_id: ObjectId(firstAnc)}, function(err, firstancel){
          if (firstancel.name!="text") {
            var textEl=firstancel.ancestors[0];
            var pbchildren=firstancel.children;
            cb(null, {textEl:textEl, pbchildren: pbchildren});
          } else cb(null, null)
        })
      },
      function(thisAnc, cb) {
        console.log("parameter "); console.log(thisAnc);
        if (!thisAnc) cb(null, null);   //all fine! no need to do anything at all
        else {
          TEI.findOne({_id: ObjectId(thisAnc.textEl)}, function(err, textel){
            if (textel.name=="text") {
              //set the children of text to children of the p element
              var pbchildren=thisAnc.pbchildren;
              console.log("about to save pbchildren "+pbchildren)
              TEI.collection.update({_id: ObjectId(thisAnc.textEl)}, {$set: {children: pbchildren, docs: [ObjectId(docroot)]}}, function (err, result) {
                  cb(null, {textEl:thisAnc.textEl, pbchildren: pbchildren});
              });
            } else cb("we have a problem here")
          })
        }
      },
      function (thisAnc, cb) {
        //set ancestors of each child to text element
        if (!thisAnc) cb(null, []);
        else {
          var pbinfs=[];
          thisAnc.pbchildren.map(function(pb){pbinfs.push({pbid: pb, textEl: thisAnc.textEl});});
          console.log("adjust pb ancestor"); console.log(pbinfs);
          async.map(pbinfs, savePbInfs, function (err) {cb(err, []);});
        }
      },
      function (argument, cb) {
        if (deleteTeis.length>0) {
          TEI.collection.remove({_id: {$in: deleteTeis}}, function (err, result) {
            cb(err,[]);
          })
        } else cb(null,[]);
      },
   ], function(err, results) {
    if (err) res.json({"success":false});
    else {
      res.json({"success":true});
    }
  });
});

function savePbInfs(pageInf, callback) {
  console.log("pbel "+pageInf.pbid+" textel "+pageInf.textEl);
  TEI.update({_id: ObjectId(pageInf.pbid)}, {$set: {ancestors: [ObjectId(pageInf.textEl)]}}, function(err) {
    callback(err);
  });
}

var globalCommAbbr;
var globalDoc;
var globalNentels=0;

//just take all the text out of the document; leave pbs and any divs surrounding etc in place
router.post('/deleteDocumentText', function(req, res, next) {
  var npages=0, nodocels=0, nallels=0, npagetrans=0, deleteTeiEntities=[], pages=[], deleteTeis=[];
  var docroot=req.query.id;
  globalCommAbbr=req.query.community;
//  console.log("starting deletion for "+docroot+" in community "+globalCommAbbr);
  //delete all docs all entitiees all revisions...
    async.waterfall([
      function(cb) {
        Doc.findOne({_id: docroot}, function(err, document) {
    //      console.log(document);
          pages=document.children;
          globalDoc=document;
          npages=document.children.length;
  //        console.log("pages "); console.log(pages);
          cb(err, []);
        });
      },
      function(argument, cb) {
        //get all the entities in this document
        TEI.find({docs: {$in: pages}}, function(err, teis) {
          teis.forEach(function(teiEl){
            if (teiEl.isEntity) {
              var entityPath=[];
              entityPath.push(teiEl.entityName);
              deleteTeiEntities.push({id:teiEl._id, entityName: teiEl.entityName, ancestorName: teiEl.entityAncestor, entityPath: entityPath, isEntity:teiEl.isEntity});
            }
          });
  //        console.log("entities to delete"); console.log(deleteTeiEntities);
          cb(err, []);
        });
      },
      function getDeleteEntityPaths (argument, cb) {
        //delete all revisions, teis and doc elements
        if (deleteTeiEntities.length>0) {
          async.map(deleteTeiEntities, getEntityPaths, function (err, results){
            deleteTeiEntities=results;
//            console.log("delete with paths"); console.log(deleteTeiEntities);
            cb(null, []);
          });
        } else {
          cb(null, []);
        }
      },
      function deleteTEIs (argument, cb) {
  //      console.log("about to delete"+deleteTeis)
  //take out every tei descending from a doc
        TEI.collection.remove({docs:  {$in: pages}, name:{$ne:"pb"}}, function(err, result) {
          nallels+=result.result.n;
//          console.log('delete teis done');
          cb(err, []);
        });
      },
      function deleteDocs (argument, cb) {
//          console.log("about to delete docs"+docroot);
//      leave pages, but remove lbs
        Doc.collection.remove({ancestors: {$in: pages}}, function(err, result) {
//            console.log(err);
            nodocels+=result.result.n;
//            console.log('delete docs done'+nodocels);
            cb(err, []);
          });
      },
      function deleteDeadEntities (argument, cb) {
//         console.log("about to keill entities" + deleteTeiEntities.length);
//         console.log("here is where we will kill the entities ");  for (var i = 0; i < deleteTeiEntities.length; i++) { console.log(deleteTeiEntities[i])};
        if (deleteTeiEntities.length>0) {
          async.mapSeries(deleteTeiEntities, deleteEntityName, function (err, results) {
            cb(err, []);
          });
        } else {cb(null, []);}
      },
      function deleteRevisions (argument, cb) {
  //      console.log(pages);
        async.forEachOf(pages, function(thisPage) {
            const cb2 = _.last(arguments);
//            console.log(thisPage);
            if (thisPage) {
              Revision.collection.remove({doc:thisPage}, function (err, result){
//                  console.log("err"); console.log(err);
      //            console.log("result"); console.log(result);
                  npagetrans+=result.result.n;
                  cb2(err);
              });
            } else {cb2(err)}
          }, function(err){
            cb(err, []);
          });
      },
    ], function(err, results) {
      res.json({"npages":npages, "nodocels": nodocels, "nentels": globalNentels, "nallels": nallels, "npagetrans": npagetrans});
  });
});

router.post('/deleteDocument', function(req, res, next) {
  var npages=0, nodocels=0, nallels=0, npagetrans=0, deleteTeiEntities=[], pages=[], deleteTeis=[];
  var docroot=req.query.id;
  globalCommAbbr=req.query.community;
//  console.log("starting deletion for "+docroot+" in community "+globalCommAbbr);
  //delete all docs all entitiees all revisions...
    async.waterfall([
      function(cb) {
        Doc.findOne({_id: docroot}, function(err, document) {
    //      console.log(document);
          pages=document.children;
          globalDoc=document;
          npages=document.children.length;
  //        console.log("pages "); console.log(pages);
          cb(err, []);
        });
      },
      function(argument, cb) {
        //find the tei  which is ancestor text of this doc
        TEI.findOne({docs: docroot}, function (err, deleteRoot) {
          if (!deleteRoot) {
    //         console.log("did not find root")
             cb(null, []);
          } else {
            if (deleteRoot.name=="text") {
              deleteTeis.push(deleteRoot._id);
              cb(err, deleteRoot._id);
            } else {
              deleteTeis.push(deleteRoot.ancestors[0]);
    //          console.log("after finding text"+deleteTeis);
    //          console.log(deleteRoot);
              cb(err, deleteRoot.ancestors[0]);
            }
          }
        });
      },
      function(textid, cb) {
        //find the body for the text of this doc
        TEI.findOne({_id: ObjectId(textid)}, function (err, body) {
          if (!body) {
  //          console.log("cant find body")
             cb(null, []);
          } else {
            deleteTeis.push(body._id);
  //          console.log("after finding body "+deleteTeis);
            cb(null, []);
          }
        });
      },
      function(argument, cb) {
        //get all the entities in this document
        TEI.find({docs: {$in: pages}}, function(err, teis) {
          teis.forEach(function(teiEl){
            if (teiEl.isEntity) {
              var entityPath=[];
              entityPath.push(teiEl.entityName);
              deleteTeiEntities.push({id:teiEl._id, entityName: teiEl.entityName, ancestorName: teiEl.entityAncestor, entityPath: entityPath, isEntity:teiEl.isEntity});
            }
          });
  //        console.log("entities to delete"); console.log(deleteTeiEntities);
          cb(err, []);
        });
      },
      function getDeleteEntityPaths (argument, cb) {
        //delete all revisions, teis and doc elements
        if (deleteTeiEntities.length>0) {
          async.map(deleteTeiEntities, getEntityPaths, function (err, results){
            deleteTeiEntities=results;
//            console.log("delete with paths"); console.log(deleteTeiEntities);
            cb(null, []);
          });
        } else {
          cb(null, []);
        }
      },
      function deleteTEIs (argument, cb) {
  //      console.log("about to delete"+deleteTeis)
        if (deleteTeis.length > 0) {
          TEI.collection.remove({
            $or: [
              {ancestors: {$in: deleteTeis}},
              {_id: {$in: deleteTeis}},
              {docs: ObjectId(docroot)},
            ]
          }, function(err, result) {
            nallels+=result.result.n;
  //          console.log('delete teis done');
            cb(err, []);
          });
        } else {
           cb(null, []);
        }
      },
      function deleteDocs (argument, cb) {
//          console.log("about to delete docs"+docroot);
        Doc.collection.remove({$or: [{_id: ObjectId(docroot)}, {ancestors: ObjectId(docroot)}]}, function(err, result) {
//            console.log(err);
            nodocels+=result.result.n;
//            console.log('delete docs done'+nodocels);
            cb(err, []);
          });
      },
      function deleteDeadEntities (argument, cb) {
//         console.log("about to keill entities" + deleteTeiEntities.length);
//         console.log("here is where we will kill the entities ");  for (var i = 0; i < deleteTeiEntities.length; i++) { console.log(deleteTeiEntities[i])};
        if (deleteTeiEntities.length>0) {
          async.mapSeries(deleteTeiEntities, deleteEntityName, function (err, results) {
            cb(err, []);
          });
        } else {cb(null, []);}
      },
      function deleteRevisions (argument, cb) {
  //      console.log(pages);
        async.forEachOf(pages, function(thisPage) {
            const cb2 = _.last(arguments);
//            console.log(thisPage);
            if (thisPage) {
              Revision.collection.remove({doc:thisPage}, function (err, result){
//                  console.log("err"); console.log(err);
      //            console.log("result"); console.log(result);
                  npagetrans+=result.result.n;
                  cb2(err);
              });
            } else {cb2(err)}
          }, function(err){
            cb(err, []);
          });
      },
      function updateDocCommunity(argument, cb) {
//        console.log(globalCommAbbr);
//        console.log(docroot)
        Community.update({'abbr': globalCommAbbr}, { $pull: { documents: docroot } }, function(err){
          cb(err, []);
        });
      }
    ], function(err, results) {
      res.json({"npages":npages, "nodocels": nodocels, "nentels": globalNentels, "nallels": nallels, "npagetrans": npagetrans});
  });
});

function deleteEntityName(thisTei, callback) {
  //calculate what ancestor entity will be..
  //either: we are dealing with base entity, in which case we are looking for the
  //tei for the entity for deletion
  //or: we are looking for ancestors of the entity, in which case find ancestor teis
  var entityAncestor="";
  var isBaseEntity=false;  //ie, at lowest level
  for (var j=0; j<thisTei.entityPath.length; j++) {
    if (thisTei.entityName==thisTei.entityPath[j]) {
      if (j==0) {  isBaseEntity=true;}
      if (j==thisTei.entityPath.length-1) entityAncestor="";
      else entityAncestor=thisTei.entityPath[j+1]
    }
  }
  //first check there are no other teis for this entity name, if we are looking
  if (isBaseEntity) {
    TEI.findOne({entityName:thisTei.entityName}, function(err, teiel) {
//      //("finding to delete "+teiel);
      //a bit tricky here. Need to see if entity exists -- might already have been deleted
      //if not deleted: delete. Regardless: go up the entity path checking each level
      if (!teiel) {
        //delete from entities. Check it is here .. if so, delete and go up tree
        //if not here: just go up the tree
        var isTopEntity;
        if (entityAncestor=="") isTopEntity=true; else isTopEntity=false;
        //delete entity right here .. if it is
        vaporizeEntity(thisTei, isTopEntity, function(){
          if (entityAncestor=="") callback(err, true);
          else {
            thisTei.entityName=entityAncestor;
            deleteEntityName(thisTei, callback, function (err1, result){
              callback(err1, true);
            });
          }
        });
      } else {
        //there is a tei -- then leave it in place
        callback(err, true);
      }
    });
  } else {
    TEI.findOne({entityAncestor:thisTei.entityName}, function(err, teiel) {
      //a bit tricky here. Need to see if entity exists -- might already have been deleted
      //if not deleted: delete. Regardless: go up the entity path checking each level
      if (!teiel) {
        //delete from entities. Check it is here .. if so, delete and go up tree
        //if not here: just go up the tree
        var isTopEntity;
        if (entityAncestor=="") isTopEntity=true; else isTopEntity=false;
        //delete entity right here .. if it is
        vaporizeEntity(thisTei, isTopEntity, function(){
          if (entityAncestor=="") callback(err, true);
          else {
            thisTei.entityName=entityAncestor;
            deleteEntityName(thisTei, callback, function (err1, result){
              callback(err1, true);
            });
          }
        });
      } else {
        //there is a tei -- then leave it in place
        callback(err, true);
      }
    });
  }
}

function vaporizeEntity (entityEl, isTopEntity, callback) {
  if (isTopEntity) {
    //take out from: the document; the communit
    async.waterfall ([
      function identifyPage (cb1) {
        if (globalDoc.ancestors.length) {
            Doc.findOne({_id: globalDoc.ancestors[0]}, function(err, doc) {
              cb1(err, doc);
            });
        } else {
          cb1(null, globalDoc);
        }
      },
      function removeEntityDoc (myDoc, cb1) {
        Doc.update({'_id': myDoc._id}, { $pull: { entities: { entityName: entityEl.entityName} } }, function(err, doc){
          cb1(err, myDoc);
        });
      },
      function removeEntityCommunity (myDoc, cb1) {
        Community.update({'abbr': globalCommAbbr}, { $pull: { entities: { entityName: entityEl.entityName} } }, function(err, doc){
          cb1(err, doc);
        });
      }
    ])
  }
  Entity.collection.remove({entityName: entityEl.entityName}, function (err, result){
    globalNentels+=result.result.n;
    callback(err, true);
  });
}

function getEntityPaths  (entityTEI, callback) {
    if (!entityTEI.isEntity || entityTEI.ancestorName=="") {
      callback(null, entityTEI);
    } else {
      Entity.findOne({entityName: entityTEI.ancestorName}, function (err, entity) {
        if (entity) {
          entityTEI.entityPath.push(entity.entityName);
          entityTEI.ancestorName=entity.ancestorName;
            //recurse up enti
          getEntityPaths(entityTEI, function (err, result) {
            callback(err, result)
          });
        } else {
          callback("Failed to find ancestor entity. This is impossible", null)
        }
      });
    }
}

router.post('/statusTranscript', function(req, res, next) {
  var isPrevPageText=false, isThisPageText=false;
  async.waterfall([
   function findDoc(cb) {
//      console.log("looking for "+req.query.docid);
      Doc.findOne({_id: ObjectId(req.query.docid)}, function(err, document){
        if (!document) {
          res.json({isPrevPageText: false, isThisPageText: false, docFound: false});
        } else {
          cb(err, document);
        }
      })
    },
    function hasPrevPageText (document, cb) {
      //is first page
      if (document.children.length[0]==req.query.pageid) {
        isPrevPageText=false;
        cb(null, []);
      } else { //not first page. Any teis for previous page?
        for (var i = 0; i < document.children.length; i++) {
          if (document.children[i]==req.query.pageid) {
              TEI.findOne({docs: ObjectId(document.children[i-1]), name:{$ne:"pb"}}, function(err, prevpagetei) {
              if (!prevpagetei) isPrevPageText=false;
              else isPrevPageText=true;
              cb(err, []);
            });
          }
        }
      }
  },  //ok, settled prev page status. What about this page?
  function hasThisPageText (argument, cb) {
//    console.log("looking for page"); console.log(req.query.pageid);
    //find the TEI for this pb
    TEI.findOne({docs: ObjectId(req.query.pageid), name: {$ne:"pb"}}, function(err, thispagetei) {
      if (!thispagetei) isThisPageText=false;
      else  isThisPageText=true;
      cb(err, [])
    });
  }                                                                         ,
 ], function(err, results) {
    res.json({isPrevPageText: isPrevPageText, isThisPageText: isThisPageText, docFound: true})
  });
});

router.post('/getDocPages', function(req, res, next){
  var myPagesOrder;
//  console.log("starting search"+req.query.document);
  async.parallel([
    function(cb) {
      Doc.findOne({_id: ObjectId(req.query.document)}, cb);
    },
    function(cb) {
      Doc.find({ancestors: ObjectId(req.query.document), label:"pb"}, cb);
    },
  ], function(err, results) {
//      console.log(results[0]);
      res.json({children: results[0].children, pages: results[1]});
  });
});

router.post('/saveDocPages', function(req, res, next) {
  var replace=req.body.replace;
  var order=req.body.order;
  var origchildren=req.body.origorder;
  async.waterfall([
    function(cb) {
      if (replace.length>0) {
        async.map(replace, replaceVals, function (err, results) {
            cb(err,[]);
        });
      } else cb(null, []);
    },
    function(argument, cb) {
      if (order.length>0) {
        //replace each order val by ObjectId
        var neworder=order.map(function(page){return ObjectId(page)});
        var neworigchildren=origchildren.map(function(page){return ObjectId(page)});
        var origchildrenteis=[], neworderteis=[];
        async.waterfall([
         function (cb1) {
              async.mapSeries(neworigchildren, getTeiDoc, function (err, teipbs) {
                origchildrenteis=teipbs;
                cb1(err, []);
              });
          },
          function (argument, cb1) {
                async.mapSeries(neworder, getTeiDoc, function (err, teipbs) {
                neworderteis=teipbs;
                cb1(err, []);
              });
          },
          function (argument, cb1) {
              Doc.collection.update({_id: ObjectId(req.query.document)}, {$set: {children: neworder}}, function (err, result) {
                cb1(err, []);
              });
          },
          function (argument, cb1) {
              TEI.collection.update({children:origchildrenteis}, {$set: {children:neworderteis}}, function (err, result){
                cb1(err, []);
            });
          }
        ], cb);
      } else cb(null);
    }
  ], function(err) {
    if (err) res.json({result: "No we did not do it"});
    else res.json({result: "Yes we did it"});
  });
});

function getTeiDoc(page, callback) {
  TEI.findOne({docs: ObjectId(page), name:"pb"}, function(err, pageTei){
    if (err) callback(err);
    else callback(null, ObjectId(pageTei._id));
  })
}

function replaceVals(replace, callback) {
    Doc.collection.update({_id: ObjectId(replace.id)}, {$set: {name: replace.name, facs: replace.facs}}, function (err, result) {
      if (!err) {
//        console.log("replacing in TEI"); console.log(replace);
        TEI.collection.update({docs: ObjectId(replace.id), name:"pb"}, {$set: {"attrs.n": replace.name, "attrs.facs": replace.facs}}, function (err, result){
          callback(err);
        });
      } else {callback(err)};
    });
};


router.post('/deleteAllDocs', function(req, res, next) {
    var ndocs=0, npages=0, ndocels=0, nentels=0, cAbbrev="", nallels=0, npagetrans=0;
  //delete all docs all entitiees all revisions...
    async.waterfall([
      function(cb) {
          Community.findOne({_id: req.query.id}, function(err, community) {
            cAbbrev=community.abbr;
            cb(err, community.documents);
          });
      },
      function(documents, cb) {
        ndocs=documents.length;
        async.map(documents, getPagesInDocs, function (err, allPages){
          for (var i = 0; i < allPages.length; i++) {
            npages+=allPages[i].length;
          }
          cb(err, allPages, documents);
        });
      },
      function (allPages, documents, cb) {
//          console.log(documents);
//          console.log(allPages)
          //now we can delete
          async.parallel([
            function(cb1) {
              Community.update({_id:req.query.id}, {$set: {documents:[], entities:[]}}, cb1);
            },
            function(cb1) {
              Doc.collection.remove({$or: [{_id: {$in: documents}}, {ancestors: {$in: documents}},]}, function (err, result){
                ndocels=result.result.n;
                cb1(err);
              });
            },
            function(cb1) {
              TEI.collection.remove( {docs: {$in: documents}}, function (err, result){
                nallels=result.result.n;
                cb1(err);
              });
            },
            function(cb1) {
              Doc.collection.remove({community: cAbbrev}, function (err, result){
                  ndocels+=result.result.n;
                cb1(err);
              });
            },
            function(cb1) {
//              console.log("allpages"+allPages);
              async.forEachOf(allPages, function(thisPage) {
                  const cb2 = _.last(arguments);
                  if (thisPage) {
                    Revision.collection.remove({$or: [{doc:thisPage}, {doc: {$in: thisPage}},]}, function (err, result){
                        npagetrans+=result.result.n;
                        cb2(err);
                    });
                  } else {cb2(err)}
                }, function(err){
                  cb1(err);
                });
            },
            function(cb1) {
              Revision.collection.remove({community: cAbbrev}, function (err, result){
                npagetrans+=result.result.n;
                cb1(err);
              });
            },
            function(cb1) {
              Entity.collection.remove({community: cAbbrev}, function (err, result){
                nentels=result.result.n;
                cb1(err);
              });
            },
            function(cb1) {
              TEI.collection.remove({community: cAbbrev}, function (err, result){
                  nallels+=result.result.n;
                cb1(err);
              });
            },
          ], function(err, results) {
            cb(null);
          });
      }
    ], function(err, results) {
      res.json({"ndocs":ndocs, "npages":npages, "ndocels": ndocels, "nentels": nentels, "nallels": nallels, "npagetrans": npagetrans});
    })
  });

function getPagesInDocs (pageID, callback) {
  Doc.findOne({_id: pageID}, function(err, page) {
    callback(err, page.children);
  });
}

router.post('/isDocTranscript', function(req, res, next) {
  //need to check every page...
  var nPageTranscripts=0;
  async.waterfall([
    function (cb) {
      Doc.findOne({_id: ObjectId(req.query.docid)}, function(err, thisdoc) {
        if (err || ! thisdoc) cb("error", []);
        else cb(null, thisdoc.children);
      })
    },
    function(children, cb) {
      var newchildren=children.map(function(page){return ObjectId(page)});
      async.mapSeries(newchildren, hasPageTranscript, function (err, results){
        results.map(function(page){if (page==1) nPageTranscripts+=1; return})
        cb(null,[]);
      });
    }
  ], function (err){
    if (err) res.json({"error": true});
    if (!nPageTranscripts) res.json({"isDocText": false});
    else res.json({"isDocText": true});
  });
});

function hasPageTranscript (page, callback) {
  TEI.findOne({docs: page, name:{$ne:"pb"}}, function (err, thistei) {
    if (err) callback(err);
    else {
      if (thistei) callback(null, 1);
      else callback(null, 0);
    }
  });
}

router.post('/validate', function(req, res, next) {
  var xmlDoc, errors;
  Community.findOne({_id: req.query.id}, function(err, community) {
    if (err) return next(err);
    let dtdPath = community.getDTDPath();
    try {
      fs.statSync(dtdPath);
    } catch (e) {
      dtdPath = './data/TEI-transcr-TC.dtd';
    }
    try {
      xmlDoc = libxml.parseXml(req.body.xml);
      xmlDoc.setDtd('TEI', 'TEI-TC', dtdPath);
      xmlDoc = libxml.parseXml(xmlDoc.toString(), {
        dtdvalid: true,
      })
      errors = xmlDoc.errors;
    } catch (err) {
      errors = [err];
    }
    res.json({
      error:   _.map(errors, function(err) {
        return _.assign({}, err, {
          message: err.message,
        });
      }),
    });
  });
});

router.use(function(err, req, res, next) {
  if (err) {
    res.status(err.status || 500);
    if (err && err.code === 11000) {
      var msg = /\$(.*)_.*\{ : (.*) }/.exec(err.message);
  //    console.log(err);
      err = {
        name: err.name,
        message: `There is already a community with the ${msg[1]} ${msg[2]}`,
      };
    }
    res.json(err);
  }
});

module.exports = router;
