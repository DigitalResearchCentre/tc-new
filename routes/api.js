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
;

//to handle emails when not on the server

if (config.localDevel) TCMailer = require('../TCMailer');


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
        pages: {"assigned":0,"inprogress":0,"submitted":0, "approved":0, "committed":0}
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

router.post('/community/:id/members/', function(req, res, next) {
//  console.log("in getting members "+req.params.id)
  var communityId = req.params.id;
  Community.findOne({_id: ObjectId(communityId)}, function(err, community) {
    async.mapSeries(community.members, function(member, callback) {
      User.findOne({ _id: member}, function(err, user){
        callback(err, user);
      });
    }, function(err, results) {
      res.json(results);
    });
  });
});

//ok -- also add to members array
router.post('/communities/:id/add-member', function(req, res, next) {
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
      community.members.push(user._id);
      user.memberships.push({
        community: community._id,
        role: role,
        pages: {"assigned":0,"inprogress":0,"submitted":0,"committed":0, "approved":0}
      });
      user.save(function(err, user) {
        if (err) {
          return next(err);
        };
        community.save(function(err, community){
          if (err) {
            return next(err);
          };
          res.json(user);
        })
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

var collationResource = new Resource(Collation, {id: 'collation'});
collationResource.serve(router, 'collations');

var actionResource = new Resource(Action, {id: 'action'});
actionResource.serve(router, 'tcactions');



//console.log("collation"); console.log(Collation);
//console.log("collation resource"); console.log(collationResource);

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

//console.log("user"); console.log(User);
//console.log("user resource"); console.log(userResource);

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
//  console.log("jere")
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
//      console.log("config"); console.log(config);
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
        community.members.push(user._id);
        user.memberships.push({
          community: community._id,
          role: role,
          pages: {"assigned":0,"inprogress":0,"submitted":0,"committed":0, "approved":0}
        });
        async.parallel([
          function(cb) {
            user.save(function(err, obj) {
              cb(err, obj);
            });
          },
          function(cb) {
            community.save(function(err, obj) {
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
//  console.log("we should be in here");
  var action = req.body;
  if (!validateAction(action)) {
    return next({error: 'Action format error'});
  }
//  console.log("we should be in here");
//  console.log(action);
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

router.post('/SUgetAllCommunities', function (req, res, next){
  if (req.user.local.email!="peter.robinson@usask.ca") res.json({error:"Not superuser"});
  Community.find({}, function(err, communities) {
    async.mapSeries(communities, function(community, callback){
      //get info on each membership..could be no members!
        async.map(community.members, function (member, cb1) {
          if (!member) cb1(null, {user: "none", role: "none"})
          User.findOne({_id:member}, function(err, myUser){
            //find membership matching this communitu] -- if it is the leader or creator, say so, else move on
           var thisMember=myUser.memberships.filter(function (obj){return String(obj.community)== String(community._id);})[0];
            cb1(err, {user: myUser.local.email, role: thisMember.role})
          })
        }, function (err, members) {
              callback(err, {name:community.name, abbr:community.abbr, public: community.public, ndocs: community.documents.length, nmembers: community.members.length, created: community.created, members: members, _id:community._id});
        })
      }, function (err, results) {
        if (err) res.json({error:err})
        else res.json(results);
      });
   });
});

router.post('/SUgetAllUsers', function(req, res, next){
  //verify that this is the superuser
//  console.log("I am "); console.log(req.user);
  //ok, let's deal with every user...
  User.find({}, function(err, users){
     async.mapSeries(users, function(user, callback){
       async.map(user.memberships, function(membership, cb1){
         Community.findOne({_id: membership.community}, function (err, myCommunity) {
             cb1(err, {name: myCommunity.name, role:membership.role, userdocs: myCommunity.documents.length, _id: myCommunity._id});
         });
       }, function (err, communities){
         callback(err, {username:user.local.name, useremail:user.local.email, communities: communities, created: user.local.created, _id:user._id});
       })
     }, function (err, results) {
       if (err) res.json({error:err})
       else res.json(results);
     })
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
        //problem! if it is reading, we need this
        //if it is a lb: add a space, unless break
        if (version.name=="rdg") {
          var attrs="";
          if (version.attrs) {
            for (var key in version.attrs) {
              attrs+=" "+key+"=\""+version.attrs[key]+"\"";
            }
          }
          content.content="<rdg"+attrs+"></rdg>";
        }
        if (version.name=="lb" || version.name=="cb" || version.name=="pb") {
          if (!version.attrs || !version.attrs.break || version.attrs.break!="no") {
            content.content=" ";
          }
        }
      }
      deferred.resolve();
  }
  return deferred.promise;
}

//get all pages with tasks for this id, return info so we can create links to each page
router.post('/getMemberTasks', function(req, res, next) {
  Doc.find({"tasks.memberId":req.query.id}, function (err, docs){
//    console.log("tasks found: "+docs.length)
    var assigned=[], inprogress=[], submitted=[], approved=[], committed=[];
    if (docs.length) {
      docs.forEach(function(doc){
        for (var i=0; i<doc.tasks.length; i++) {
          if (doc.tasks[i].memberId==req.query.id) {
            if (doc.tasks[i].status=="ASSIGNED") assigned.push({pageId: doc._id, name: doc.name, docId:doc.ancestors[0], docName:doc.tasks[i].witname});
            if (doc.tasks[i].status=="IN_PROGRESS") inprogress.push({pageId: doc._id, name: doc.name, docId:doc.ancestors[0], docName:doc.tasks[i].witname});
            if (doc.tasks[i].status=="SUBMITTED") submitted.push({pageId: doc._id, name: doc.name, docId:doc.ancestors[0], docName:doc.tasks[i].witname});
            if (doc.tasks[i].status=="APPROVED") approved.push({pageId: doc._id, name: doc.name, docId:doc.ancestors[0], docName:doc.tasks[i].witname});
            if (doc.tasks[i].status=="COMMITTED") committed.push({pageId: doc._id, name: doc.name, docId:doc.ancestors[0], docName:doc.tasks[i].witname});
          }
        }
      })
    }
    //update count of lengths in memberships pages
    User.collection.update({ "memberships._id":ObjectId(req.query.id)}, {$set:{"memberships.$.pages.inprogress":inprogress.length, "memberships.$.pages.submitted":submitted.length, "memberships.$.pages.approved":approved.length, "memberships.$.pages.committed":committed.length}}, function(err, result){
      res.json({memberId:req.query.id, assigned:assigned, inprogress:inprogress, submitted:submitted, approved:approved, committed:committed});
    })
  })
});

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
  //      console.log("parameter "); console.log(thisAnc);
        if (!thisAnc) cb(null, null);   //all fine! no need to do anything at all
        else {
          TEI.findOne({_id: ObjectId(thisAnc.textEl)}, function(err, textel){
            if (textel.name=="text") {
              //set the children of text to children of the p element
              var pbchildren=thisAnc.pbchildren;
//              console.log("about to save pbchildren "+pbchildren)
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
//          console.log("adjust pb ancestor"); console.log(pbinfs);
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
//  console.log("pbel "+pageInf.pbid+" textel "+pageInf.textEl);
  TEI.update({_id: ObjectId(pageInf.pbid)}, {$set: {ancestors: [ObjectId(pageInf.textEl)]}}, function(err) {
    callback(err);
  });
}

var globalCommAbbr;
var globalDoc;
var globalNentels=0;

//just take all the text out of the document; leave pbs and any divs surrounding etc in place
//todo -- make surviving children pbs direct children of textelement
router.post('/deleteDocumentText', function(req, res, next) {
  var npages=0, nodocels=0, nallels=0, npagetrans=0, deleteTeiEntities=[], pages=[], deleteTeis=[], nTeis=0;
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
        //get all the teis in this document
        TEI.find({docs: {$in: pages}}, function(err, teis) {
//          console.log("number of teis "+teis.length)
          nTeis=teis.length;
          if (nTeis<3000) {
            teis.forEach(function(teiEl){
              if (teiEl.isEntity) {
                var entityPath=[];
                entityPath.push(teiEl.entityName);
                deleteTeiEntities.push({id:teiEl._id, entityName: teiEl.entityName, ancestorName: teiEl.entityAncestor, entityPath: entityPath, isEntity:teiEl.isEntity});
              }
            });
    //        console.log("entities to delete"); console.log(deleteTeiEntities);
            cb(err, []);
          } else {
            //top down deletion
            cb(err, []);
          }
        });
      },
      function getDeleteEntityPaths (nTeis, cb) {
        //delete all revisions, teis and doc elements
        if (nTeis<3000) {
          if (deleteTeiEntities.length>0) {
            async.map(deleteTeiEntities, getEntityPaths, function (err, results){
              deleteTeiEntities=results;
  //            console.log("delete with paths"); console.log(deleteTeiEntities);
              cb(null, []);
            });
          } else {
            cb(null, []);
          }
        } else {cb(null, [])};
      },
      function deleteTEIs (argument, cb) {
  //      console.log("about to delete"+deleteTeis)
  //take out every tei descending from a doc
        TEI.collection.remove({docs:  {$in: pages}, name:{$ne: "pb"}}, function(err, result) {
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
        if (nTeis<3000) {
          if (deleteTeiEntities.length>0) {
            async.mapSeries(deleteTeiEntities, deleteEntityName, function (err, results) {
              cb(err, []);
            });
          } else {cb(null, []);}
        } else {
          //more than 3000.. do top down removL
          globalNentels=0;
          globalDeleteEntities=[];
          Community.findOne({'abbr': globalCommAbbr}, function(err, myCommunity){
            async.map(myCommunity.entities, topDownDeleteEntity, function (err, results){
  //            console.log("getting rid of "+globalNentels);
              Entity.collection.remove({_id: {$in: globalDeleteEntities}}, function(err, result){
  //              console.log("done removal")
                cb(err, []);
              });
            })
          })
        }
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
      },   //missing and important! add all teis for pages as children for text element, and make each pb a child of text
      function reshufflePbs (argument, cb) {
        async.map(pages, getTeiEl, function (err, allTeiPbs) {
  //        console.log("the docs "+pages);
  //        console.log("got the pbs now "+allTeiPbs);
          //now get the text element..
  //        console.log(allTeiPbs[0]);
          TEI.findOne({_id: ObjectId(allTeiPbs[0].ancestors[0])}, function (err, textEl){
            async.forEachOf(allTeiPbs, function(thisPb) {
              const cb2 = _.last(arguments);
              TEI.update({_id: thisPb._id}, {$set: {ancestors: [textEl._id]}}, function (err){
                cb2(err);
              });
            }, function(err){  //loses body front etc
              TEI.update({_id: textEl._id}, {$set: {children: allTeiPbs}}, function (err){
                cb(err, []);
              })
            });
          });
        });
      },
    ], function(err, results) {
      res.json({"npages":npages, "nodocels": nodocels, "nentels": globalNentels, "nallels": nallels, "npagetrans": npagetrans});
  });
});

var globalDeleteEntities=[];

router.post('/deleteDocument', function(req, res, next) {
  var npages=0, nodocels=0, nallels=0, npagetrans=0, deleteTeiEntities=[], pages=[], deleteTeis=[], nTeis=0;
  var docroot=req.query.id;
  globalCommAbbr=req.query.community;
//  console.log("starting deletion for "+docroot+" in community "+globalCommAbbr);
  //delete all docs all entitiees all revisions...
    async.waterfall([
      function(cb) {
        Doc.findOne({_id: ObjectId(docroot)}, function(err, document) {
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
          nTeis=teis.length;
  //        console.log("about to delete document teis "+nTeis)
          if (nTeis<3000) {
            teis.forEach(function(teiEl){
              if (teiEl.isEntity) {
                var entityPath=[];
                entityPath.push(teiEl.entityName);
                deleteTeiEntities.push({id:teiEl._id, entityName: teiEl.entityName, ancestorName: teiEl.entityAncestor, entityPath: entityPath, isEntity:teiEl.isEntity});
              }
            });
          }
  //        console.log("entities to delete"); console.log(deleteTeiEntities);
          cb(err, []);
        });
      },
/*      function getDeleteEntityPaths (argument, cb) {
        //delete all revisions, teis and doc elements
        if (nTeis<3000) {
          if (deleteTeiEntities.length>0) {
            async.map(deleteTeiEntities, getEntityPaths, function (err, results){
              deleteTeiEntities=results;
//              console.log("delete with paths"); console.log(deleteTeiEntities);
              cb(null, []);
            });
          } else {
            cb(null, []);
          }
        } else {cb(null, []);}
      }, */
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
/*      function deleteDeadEntities (argument, cb) {  //this routine is very destructive of performance. Skip it. Let's make a separate tool for doing this
//         console.log("about to keill entities" + deleteTeiEntities.length);
//         console.log("here is where we will kill the entities ");  for (var i = 0; i < deleteTeiEntities.length; i++) { console.log(deleteTeiEntities[i])};
        if (nTeis<3000) {
          if (deleteTeiEntities.length>0) {
            async.mapSeries(deleteTeiEntities, deleteEntityName, function (err, results) {
              cb(err, []);
            });
          } else {cb(null, []);}
        } else {cb(null, []);}
      }, */
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
/*      function updateDeleteEntities (argument, cb) {
        if (nTeis>=3000) {
          //ok, check every entity and delete all those for which we have no TEI
          globalNentels=0;
          globalDeleteEntities=[];
          Community.findOne({'abbr': globalCommAbbr}, function(err, myCommunity){
            async.map(myCommunity.entities, topDownDeleteEntity, function (err, results){
//              console.log("getting rid of "+globalNentels);
              Entity.collection.remove({_id: {$in: globalDeleteEntities}}, function(err, result){
//                console.log("done removal")
                cb(err, []);
              });
            })
          })
        } else {cb(null, [])}
      }, */
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

var globalEntitiesRemoved;
function topDownDeleteEntity(thisEntity, callback) {
  //given an entity: checks if there are any tei which have this entity. If not, wipe it out
  //note! find is FAR faster than findOne
  TEI.find({entityName:thisEntity.entityName}, function(err, results){
    if (results.length==0) {
  //      console.log("missing at "+thisEntity.entityName);
//      Entity.collection.remove({entityName:thisEntity.entityName}, function(err, result){
        globalDeleteEntities.push(ObjectId(thisEntity._id));
        globalNentels+=1;
//        if (globalNentels % 1000 == 0) console.log("deleting entities "+globalNentels+" this one "+thisEntity.entityName);
        if (!thisEntity.ancestorName) {
//          console.log("about to remove "+thisEntity.entityName);
          Community.update({abbr:globalCommAbbr},{$pull: {entities:  {entityName:thisEntity.entityName}}}, function (err, result) {
            if (!thisEntity.isTerminal) {
              Entity.find({ancestorName: thisEntity.entityName}, function(err, results){
                if (!results.length) callback(err);
                else async.map(results, topDownDeleteEntity, function(err, results){callback(err)});
              });
            } else {callback(null);}
          });
        } else {
          if (!thisEntity.isTerminal) {
            Entity.find({ancestorName: thisEntity.entityName}, function(err, results){
              if (!results.length) callback(err);
              else async.map(results, topDownDeleteEntity, function(err){callback(err)});
            });
          } else {callback(null);}
        }
//      })
    } else {
      if (!thisEntity.isTerminal) {
        Entity.find({ancestorName: thisEntity.entityName}, function(err, results){
          if (!results.length) callback(err);
          else async.map(results, topDownDeleteEntity, function(err){callback(err)});
        });
      } else {callback(null);}
    }
  });
}

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
    TEI.find({entityName:thisTei.entityName}, function(err, results) {
//      //("finding to delete "+teiel);
      //a bit tricky here. Need to see if entity exists -- might already have been deleted
      //if not deleted: delete. Regardless: go up the entity path checking each level
      if (results.length==0) {
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
    TEI.find({entityAncestor:thisTei.entityName}, function(err, results) {
      //a bit tricky here. Need to see if entity exists -- might already have been deleted
      //if not deleted: delete. Regardless: go up the entity path checking each level
      if (results.length==0) {
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
    ], function (err, results) {
      Entity.collection.remove({entityName: entityEl.entityName}, function (err, result){
        globalNentels+=result.result.n;
        callback(err, true);
      });
    })
  } else {
    Entity.collection.remove({entityName: entityEl.entityName}, function (err, result){
      globalNentels+=result.result.n;
      callback(err, true);
    });
  }
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

router.post('/changeTranscriptStatus', function(req, res, next) {
  var communityId=req.query.communityId;
  var userId=req.query.userId;
  var pageId=req.query.pageId;
  var docId=req.query.docId;
  var status=req.query.status;
//  console.log("community "+communityId+" user "+userId+" page "+pageId);
  async.parallel([
        function(cb1) {
          Doc.collection.update({_id:ObjectId(pageId), "tasks.userId":userId}, {$set: {"tasks.$.status":status}}, function(err, result){
            if (result.result.n==0) { //no page task.. page not assigned, changed by leader eg.. make a task
              var witname, username, memberid;
              async.waterfall([
                function(cb3){
                  Doc.findOne({_id:ObjectId(docId)}, function(err, thisDoc) {witname=thisDoc.name;
                    cb3(err);})
                },
                function(cb3){User.findOne({_id:ObjectId(userId)}, function(err, thisUser){ username=thisUser.local.name;
                    for (var i=0; i<thisUser.memberships.length; i++) { if (String(thisUser.memberships[i].community)==communityId) memberid=String(thisUser.memberships[i]._id);}
                    cb3(err);})
                }
              ], function (err, result){
                  if (!err) {
                    Doc.collection.update({_id:ObjectId(pageId)}, {$push: {tasks: {userId:userId, name:username, status:"IN_PROGRESS", memberId:memberid, date:Date.now(), witname:witname}}}, function (err, result){
                      if (!err) res.json({error:"none"})
                      else res.json({error:err});
                    })
                  } else {
                     res.json({error: err});
                  }
              }
            )
          } else {cb1(err)}
         });
       },
      function(cb1){
        if (status=="IN_PROGRESS") {
          //decrement assigned, increment IN_PROGRESS
          User.collection.update({_id:ObjectId(userId), "memberships.community":ObjectId(communityId)}, {$inc: {"memberships.$.pages.inprogress":1}}, function(err, result){
            cb1(err);
          });
       } else cb1(null);
     },
     function(cb1){
       if (status=="SUBMITTED") {
         //decrement assigned, increment IN_PROGRESS
         User.collection.update({_id:ObjectId(userId), "memberships.community":ObjectId(communityId)}, {$inc: {"memberships.$.pages.inprogress":-1, "memberships.$.pages.submitted":1}}, function(err, result){
           cb1(err);
         });
       } else cb1(null);
      },
      function(cb1){
        if (status=="APPROVED") {
          //this one is more complex. We need to update page status for the original transcriber, and update page counts for him/her too
          var assignedUser="";
          User.collection.update({_id:ObjectId(userId), "memberships.community":ObjectId(communityId)}, {$inc: {"memberships.$.pages.approved":1}}, function(err, result){
            //locate the page and the original user...
            //the original user: will be the whose approverid == current user id
            //so: go through tasks, check each membership
            if (!err) {
              Doc.findOne({_id: ObjectId(pageId)}, function(err, myDoc){
                async.map(myDoc.tasks, function(task, callback){
                  if (task.userId!=userId) {
                    //find the user for this task
                    User.findOne({_id:ObjectId(task.userId)}, function(err, myUser){
                      //is there a membership for this user which has the current user as approver?
                      for (var i=0; i<myUser.memberships.length; i++) {
                        if (myUser.memberships[i].approverid==userId) assignedUser=task.userId;
                      }
                      callback(err,[]);
                    });
                  } else callback(null, []);
                }, function(err, results){
                  //got the assignedUser... so write appropriate values to the page task for assigned user and update numbers for approver and User
                  async.waterfall([
                    function(cb2){
                      Doc.collection.update({_id:ObjectId(pageId), "tasks.userId":assignedUser}, {$set: {"tasks.$.status":status}}, function(err, result){
                        cb2(err);
                      });
                    },
                    function(cb2){
                      User.collection.update({_id:ObjectId(assignedUser), "memberships.community":ObjectId(communityId)}, {$inc: {"memberships.$.pages.submitted":-1, "memberships.$.pages.approved":1}}, function(err, result){
                        cb2(err);
                      });
                    }
                  ], function(err, results){
                    cb1(err);
                  })
                });
              });
            }
            else cb1(err);
          });
       } else cb1(null);
     },
     function(cb1){
       if (status=="COMMITTED") {
         var witname, username, memberid;
         async.waterfall([
           function(cb3){
             Doc.findOne({_id:ObjectId(docId)}, function(err, thisDoc){
               witname=thisDoc.name;
               cb3(err);
             })
           },
           function(cb3){
             User.findOne({_id:ObjectId(userId)}, function(err, thisUser){
               username=thisUser.local.name;
               for (var i=0; i<thisUser.memberships.length; i++) {
                 if (String(thisUser.memberships[i].community)==communityId) memberid=String(thisUser.memberships[i]._id);
               }
               cb3(err);
             })
           }
         ], function (err, results) {
           Doc.findOne({_id: ObjectId(pageId)}, function (err, thisDoc){
             var tasks=[];
             var foundCommitter=false;
             for (var i=0; i<thisDoc.tasks.length; i++) {
               if (thisDoc.tasks[i].userId==userId) foundCommitter=true;
               tasks.push(thisDoc.tasks[i]);
               tasks[tasks.length-1].status="COMMITTED";
             }
             //if there is no task for this user.. add one
             if (!foundCommitter) tasks.push({userId:userId, name:username, status:"COMMITTED", memberId:memberid, date:Date.now(), witname:witname});
             Doc.collection.update({_id:ObjectId(pageId)}, {$set: {tasks: tasks}}, function (err, result){
               cb1(err);
             })
           });
         });
       } else cb1(null);
    }
  ], function(err){
    if (err)  res.json({error: err});
    else res.json({error:"none"});
  })
});

router.post('/statusTranscript', function(req, res, next) {
  var isPrevPageText=false, isThisPageText=false, isMultiPages=false;
  globalTextEl=null;
//  console.log("starting in status")
  async.waterfall([
   function findDoc(cb) {
//      console.log("looking for "+req.query.docid);
      Doc.findOne({_id: ObjectId(req.query.docid)}, function(err, document){
        if (!document) {
          res.json({isPrevPageText: false, isThisPageText: false, docFound: false});
          cb("a problem",[]);
        } else {
          cb(err, document);
        }
      })
    },
    function(document, cb) {  //get the text element. If no textel with these children -- then must have transcripts
//      console.log("looking for text el for"+req.query.docid);
      TEI.findOne({name:"pb", docs: ObjectId(req.query.docid)}, function (err, pbEl){
        //top level ancestor of pbEl by definition will be the text elements
        if (err) cb(err, []);
        else {
          TEI.findOne({_id: ObjectId(pbEl.ancestors[0]), name:"text"}, function (err, textEl) {
            if (err) cb(err, []);
            else {
              globalTextEl=textEl;
//              if (!globalTextEl) console.log("no text el???");
//              console.log("got text el "+globalTextEl)
              cb(null, document);
            }
          });
        }
      })
    },
    function hasPrevPageText (document, cb) {
      //is first page
//      console.log("testing doc children"+document);
      if (document.children.length>1) isMultiPages=true;
      if (document.children[0]==req.query.pageid) {
        isPrevPageText=false;
        cb(null, document);
      } else { //not first page. Any teis for previous page?
        //changed how we do this... now, if the parent of this is our friend the text element then it is blank
        var foundN=0;
  //      console.log("looking in"+document+" for page "+req.query.pageid);
        for (var i = 1; i < document.children.length; i++) {
          if (document.children[i]==req.query.pageid) {  //get the previous page tei and check against textel children
            foundN=i;
            i=document.children.length;
          }
        }
  //      console.log("looking for "+document.children[foundN-1]+" at offset "+foundN);
        //possibly, this could be out of sync and return null
        TEI.findOne({name:"pb", docs: ObjectId(document.children[foundN-1])}, function (err, pbTei){
//          console.log("got the pbtei "+pbTei)
          if (!globalTextEl) {
                //how can this happpen? dunno
            isPrevPageText=isThisPageText=isMultiPages=false;
            cb("no global", []);
          } else {
            var prevPbInText=globalTextEl.children.filter(function(obj){return String(obj) == String(pbTei._id);})[0];
            if (prevPbInText) isPrevPageText=false;
            else isPrevPageText=true;
            i=document.children.length;
            cb(null, document);
          }
        });
      }
  },  //ok, settled prev page status. What about this page? Again: if direct child of the text element, no text
  function hasThisPageText (document, cb) {
//    console.log("looking for page text now"); console.log(req.query.pageid);
    //find the TEI for this pb
    TEI.findOne({name:"pb", docs:ObjectId(req.query.pageid)}, function (err, pbTei){
      //note...there might be no children of the
      if (!globalTextEl) {
            //how can this happpen? dunno
            isThisPageText=true;
            cb(null,[]);
      } else {
        var thisPbInText=globalTextEl.children.filter(function(obj){return String(obj) == String(pbTei._id);})[0];
        if (thisPbInText) isThisPageText=false;
        else isThisPageText=true;
        cb(null, []);
      }
    });
  }
 ], function(err, results) {
//    console.log("about to stop..")
    res.json({isPrevPageText: isPrevPageText, isThisPageText: isThisPageText, isMultiPages: isMultiPages, docFound: true})
  });
});

router.post('/getDocumentPage', function(req, res, next){
  Doc.findOne({_id: ObjectId(req.query.docid)}, function(err, document) {
    if (!err) {
  //    console.log(document);
      Doc.findOne({_id: ObjectId(req.query.pageid)}, function(err, page) {
  //      console.log(page)
        if (!err) {
          res.json({document: document, page:page});
        } else res.json({error: err});
      });
    } else res.json({error: err});
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

router.post('/getApprovers', function(req, res, next) {
//  console.log("community ", req.query.community);
  User.find({"memberships.community": ObjectId(req.query.community), "memberships.role": {$in:['LEADER', 'CREATOR', 'APPROVER']}}, function(err, approvers){
//    console.log(err);
//    console.log(approvers.length);
    res.json(approvers);
  });
});

router.post('/changeRole', function(req, res, next) {
  User.collection.update({"memberships._id": ObjectId(req.query.id)}, {$set: {"memberships.$.role":req.query.role}}, function(err, result){
    res.json({error: err});
  });
});

//adjust page tasks; adjust various numbers; send an email to our friendly approver
router.post('/notifyTranscriptApprover', function(req, res, next) {
  var pageId=req.query.pageId, userId=req.query.userId, approverId=req.query.approverId, communityId=req.query.communityId, documentId=req.query.documentId, memberId=req.query.memberId;
  var myUser, myApprover, myDocument, myPage, myCommunity, myApproverMembershipId;
  //use waterfall to bring back the info we need to make the page
  //we need to create a task for the page for the approver
  async.waterfall([
    function(cb){
      User.findOne({_id:ObjectId(userId)}, function(err, user){
        myUser=user;
        cb(err);
      })
    },
    function(cb){
      User.findOne({_id:ObjectId(approverId)}, function(err, approver){
        myApprover=approver;
        var myApproverMembership=myApprover.memberships.filter(function (obj){return String(obj.community)==communityId;})[0];
        myApproverMembershipId=String(myApproverMembership._id);
        cb(err);
      })
    },
    function(cb){
      Community.findOne({_id:ObjectId(communityId)}, function(err, community){
        myCommunity=community;
        cb(err);
      })
    },
    function(cb){
      Doc.findOne({_id:ObjectId(documentId)}, function(err, doc){
        myDocument=doc;
        cb(err);
      })
    },
    function(cb){
      Doc.findOne({_id:ObjectId(pageId)}, function(err, page){
        myPage=page;
        cb(err);
      })
    },
    function(cb){
      User.collection.update({_id:ObjectId(approverId), "memberships.community":ObjectId(communityId)}, {$inc: {"memberships.$.pages.submitted":1}}, function(err, result) {
        cb(err);
      })
    }
  ], function(err) {
      if (err) {res.json({"error":err})}
      else {
//        console.log("pageId="+myPage._id+" userId="+myUser._id+" name="+myUser.local.name+" memberId="+memberId+" witname="+myDocument.name+" approverName="+myApprover.local.name);
        Doc.collection.update({_id: ObjectId(myPage._id)},{$push:{"tasks":{userId:approverId, name: myApprover.local.name, status: "SUBMITTED", memberId: myApproverMembershipId, date:Date.now(), witname:myDocument.name}}}, function (err) {
          if (err) {res.json({"error":err})} else {
            var message = ejs.render(
            fs.readFileSync(
              __dirname + '/../views/notifyapprover.ejs', 'utf8'),
              {
                approvername: myApprover.local.name,
                approvermail: myApprover.local.email,
                url: config.host_url+'/app/community/?id'+communityId+'&route=view&document='+documentId+'&page='+pageId,
                username: myUser.local.name,
                useremail: myUser.local.email,
                pagename: myPage.name,
                docname: myDocument.name
              }
            );
            TCMailer.localmailer.sendMail({
              from: TCMailer.addresses.from,
              to: myApprover.local.email,
              subject: 'Page submitted for approval',
              html: message,
              text: message.replace(/<[^>]*>/g, '')
            });
            res.json({error: "none"});
          }
        });
      }
  });
});

router.post('/changeApprover', function(req, res, next) {
  User.findOne({_id:ObjectId(req.query.userId)}, function (err, user) {
    User.collection.update({"memberships._id": ObjectId(req.query.memberId)}, {$set: {"memberships.$.approvername":user.local.name, "memberships.$.approvermail":user.local.email, "memberships.$.approverid": user._id}}, function(err, result){
      res.json({error: err});
    });
  });
});


router.post('/deleteAssignPages', function(req, res, next) {
  var deselected=req.body.deselected;
  var membership=deselected[0].record.memberId;
  var user=deselected[0].record.userId;
  async.map(deselected, deleteAP, function (err) {
    User.collection.update({_id: ObjectId(user), "memberships._id": ObjectId(membership)}, {$inc: {"memberships.$.pages.assigned":-deselected.length}}, function (err, result){
      res.json({error: err});
    })
  });
});

function deleteAP (deleteAP, callback) {
  Doc.collection.update({_id: ObjectId(deleteAP.pageId)},{$pull: {"tasks":{userId:deleteAP.record.userId}}}, function (err) {
    callback(err)
  });
}

router.post('/saveAssignPages', function(req, res, next) {
  var selected=req.body.selected;
  var membership=selected[0].record.memberId;
  var user=selected[0].record.userId;
  async.map(selected, saveAP, function (err) {
    User.collection.update({_id: ObjectId(user), "memberships._id": ObjectId(membership)}, {$inc: {"memberships.$.pages.assigned":selected.length}}, function (err, result){
      res.json({error: err});
    })
  });
});

function saveAP (addAP, callback) {
  Doc.collection.update({_id: ObjectId(addAP.pageId)},{$push:{"tasks":{userId:addAP.record.userId, name: addAP.record.name, status: addAP.record.status, memberId: addAP.record.memberId, date:Date.now(), witname:addAP.record.witname}}}, function (err) {
    callback(err)
  });
}

router.post('/sendInvitation', function(req, res, next) {
  var email=req.body.email;
  var name=req.body.name;
  var communityId=req.query.community;
  var letter=req.body.letter;
  var communityName=req.body.communityName;
  var leaderEmail=req.body.leaderEmail;
  var leaderName=req.body.leaderName;
//  console.log("email "+email+" name "+name+" community "+communityId+" letter "+letter+" communityName "+communityName+" leaderEmail "+leaderEmail+" leaderName "+leaderName);
  //first, we check: is there a member with this name??
  User.findOne({"local.email":email}, function(err, user){
    if (user) {
      //already member of this community?
      var is_member=user.memberships.filter(function(obj){return String(obj.community) == communityId;})[0];
      if (is_member) res.json({result: name+" is registered with the email "+email+" and is already a member of this community."})
      else {
        //add membership to user, and member to community
        User.collection.update({_id: user._id}, {$push: {memberships:{community:ObjectId(communityId), role: "MEMBER", pages: {"assigned":0,"inprogress":0,"submitted":0, "approved":0, "committed":0}, created: new Date(), _id: ObjectId()}}}, function(err, result){
          if (!err) {
              Community.collection.update({_id:ObjectId(communityId)}, {$push:{members:user._id}}, function(err, result){
                if (!err) {
                  res.json({result: name+" is already registered in Textual Communities with the email "+email+", and has been added to the membership of this community"})
                } else {res.json({error:err})}
              })
          } else {res.json({error: err})}
        })
      }
    } else {
      //make a new user, then send an email
      var newUser= new User();
      newUser.local.email = email;
      newUser._id=ObjectId();
      newUser.local.name =  name;
      newUser.local.password = newUser.generateHash("default");
      newUser.memberships.push({community:ObjectId(communityId), role: "MEMBER", pages: {"assigned":0,"inprogress":0,"submitted":0, "approved":0, "committed":0}, created: new Date(), _id: ObjectId()})
      newUser.local.authenticated= "1";
      newUser.save(function(err) {
        if (!err) {
          Community.collection.update({_id:ObjectId(communityId)}, {$push:{members:newUser._id}}, function(err, result){
            if (!err) {
              //right. Do the emailCMailer.localmailer.sendMail
              TCMailer.localmailer.sendMail({
                from: TCMailer.addresses.from,
                to: email,
                replyTo: leaderEmail,
                cc: leaderEmail,
                subject: "Invitation from "+leaderName+" to join the "+communityName+" Textual Community",
                html: letter,
                text: letter.replace(/<[^>]*>/g, '')
              }, function (err, info) {
                if (!err) {
                  res.json({result: "An email has been sent to "+name+", who is now registered in Textual Communities with the email "+email+", and added to the membership of this community"});
                } else {res.json({error: err})};
              }
            );
           } else {res.json({error: err})};
         });
       } else {res.json({error: err})}
      })
    }
  });
});

router.post('/getPbTEIs', function(req, res, next){
  var docid=req.query.docid;
//  console.log(docid);
  var pages=[];
  TEI.find({name:"pb", "docs.0":ObjectId(docid)}, function(err, teis){
//    console.log(teis.length);
    teis.forEach(function(teiEl){
      pages.push({attrs: teiEl.attrs, name:teiEl.attrs.n})
    });
    res.json(pages);
  });
});

router.post('/moveTC1Transcripts', function(req, res, next){
  var pages=req.body;
  var cAbbrev=req.query.community;
  var communityid=req.query.communityid;
  var revisions=[];  //gather them all up and write in one operation
  var users=[];  //so we only need search once for any user
  var memberships=[]; //the same for members
  async.mapSeries(pages, function(page, cb1){
//    console.log(page.doc);
    async.map(page.revisions, function(revision, cb2) {
      var myUser=users.filter(function (obj){return (obj.email==revision.email);})[0]
      if (!myUser) {
        User.findOne({"local.email":revision.email}, function(err, user){
          if (user) {
            users.push({email:revision.email, _id: user._id});
            revisions.push({doc: ObjectId(revision.doc), community: cAbbrev, text: revision.text, user: user._id, committed: testNull(revision.committed), created: new Date(revision.created), status: revision.status});
            cb2(null);
          } else {
            myUser=users.filter(function (obj){return (obj.email=="peter.robinson@usask.ca");})[0]
            if (!myUser) {
              User.findOne({"local.email":"peter.robinson@usask.ca"}, function(err, user){
                users.push({email:"peter.robinson@usask.ca", _id: user._id});
                revisions.push({doc: ObjectId(revision.doc), community: cAbbrev, text: revision.text, user: user._id, committed: testNull(revision.committed), created: new Date(revision.created), status: revision.status});
                cb2(null);
              });
            } else {
              revisions.push({doc: ObjectId(revision.doc), community: cAbbrev, text: revision.text, user: myUser._id, committed: testNull(revision.committed), created: new Date(revision.created), status: revision.status});
              cb2(null);
            }
          }
        })
      } else {
        revisions.push({doc: ObjectId(revision.doc), community: cAbbrev, text: revision.text, user: myUser._id, committed: testNull(revision.committed), created: new Date(revision.created), status: revision.status});
        cb2(null);
      }
    }, function(err){
      var tasks=[];
      async.map(page.tasks, function(task, cb3){
        var taskUser=users.filter(function (obj){return (obj.email==task.email);})[0]
        if (!taskUser) {
          User.findOne({"local.email":task.email}, function(err, thisuser){
            if (thisuser) {
              users.push({email: task.email, _id: thisuser._id})
              var taskMember=memberships.filter(function (obj){return (obj.email==task.email);})[0];
              if (!taskMember) {
                taskMember=thisuser.memberships.filter(function (obj){return (String(obj.community)==String(communityid));})[0];
                memberships.push({email: task.email, _id:taskMember._id});
              }
              tasks.push({name:task.name, status: task.status, date: new Date(), memberId: String(taskMember._id), witname: task.witname, userId: String(thisuser._id)});
              cb3(null);
            } else {
  //            console.log("cant find "+task.email)
              taskUser=users.filter(function (obj){return (obj.email=="peter.robinson@usask.ca");})[0];
              if (!taskUser)  {
                User.findOne({"local.email":"peter.robinson@usask.ca"}, function(err, thisuser){
    //              console.log("found me "+thisuser)
                  users.push({email: "peter.robinson@usask.ca", _id: thisuser._id})
                  var taskMember=memberships.filter(function (obj){return (obj.email=="peter.robinson@usask.ca");})[0];
                  if (!taskMember) {
                    taskMember=thisuser.memberships.filter(function (obj){return (String(obj.community)==String(communityid));})[0];
                    memberships.push({email: "peter.robinson@usask.ca", _id:taskMember._id});
                  }
                  tasks.push({name:task.name, status: task.status, date: new Date(), memberId:String(taskMember._id), witname: task.witname, userId: String(thisuser._id)});
                  cb3(null);
                });
              } else {
                var taskMember=memberships.filter(function (obj){return (obj.email=="peter.robinson@usask.ca");})[0]; //this must work
                if (!taskMember) {
                    User.findOne({"local.email":"peter.robinson@usask.ca"}, function(err, thisuser){
                      taskMember=thisuser.memberships.filter(function (obj){return (String(obj.community)==String(communityid));})[0];
                      tasks.push({name:task.name, status: task.status, date: new Date(), memberId:String(taskMember._id), witname: task.witname, userId: String(taskUser._id)});
                      memberships.push({email: "peter.robinson@usask.ca", _id:taskMember._id});
                      cb3(null);
                    });
                } else {
                  tasks.push({name:task.name, status: task.status, date: new Date(), memberId:String(taskMember._id), witname: task.witname, userId: String(taskUser._id)});
                  cb3(null);
                }
              }
            }
          })
        } else {  //we have a user for this task. Need a memberid please..
          var taskMember=memberships.filter(function (obj){return (obj.email==task.email);})[0];
          if (!taskMember) { //ok -- but we have a taskUser, so load her up
              User.findOne({_id: taskUser._id}, function(err, thisuser){
                taskMember=thisuser.memberships.filter(function (obj){return (String(obj.community)==String(communityid));})[0];
                memberships.push({email: task.email, _id:taskMember._id});
                tasks.push({name:task.name, status: task.status, date: new Date(), memberId:String(taskMember._id), witname: task.witname, userId: String(taskUser._id)});
                cb3(null);
              });
          } else {
            tasks.push({name:task.name, status: task.status, date: new Date(), memberId: String(taskMember._id), witname: task.witname, userId: String(taskUser._id)});
            cb3(null);
          }
        }
      }, function(err){
        //dealt with all tasks for this page. Insert them on the current page
//        console.log("at end of call "+page.doc)
        if (tasks.length==0) cb1(null)
        else {
          Doc.update({_id: ObjectId(page.doc)}, {$push: {tasks:{$each: tasks}}}, function(err){
            cb1(null)
          });
        }
      });
    });
  }, function(err){
    if (!err) {
//      console.log(revisions.length);
      //add them All-- ok, split the revisions else insertMany fails on very large numbers
      var incr=0;
      Revision.insertMany(revisions, function(err, result){
          res.json({success: "yes"});
      })
    } else {
      res.json({error: err})
    }
  });
});

function testNull(date) {
  if (date==null || date==undefined || date=="") return(null);
  else return(new Date(date));
}

router.post('/importTC1Users', function(req, res, next){
  var users=req.body;
//  console.log(users);
  var cAbbrev=req.query.community;
  var nusers=0;
  var importedusers=[];
  Community.findOne({abbr:cAbbrev}, function(err, community){
    async.map(users, function(user, callback) {
      User.findOne({"local.email": user.email}, function(err, myUser) {
        if (myUser) {
          //assume we are already a member of this community and do nothing
//        console.log(myUser);
          callback(err);
        } else {
            var newUser = new User();
            newUser._id=ObjectId();
            newUser.local.email = user.email;
            newUser.local.name = user.name;
            newUser.local.authenticated = 1;
            newUser.local.password=newUser.generateHash("default");
            newUser.local.created=new Date(user.created);
            //make them all members, change later
            newUser.memberships=[{community:community._id, role:'MEMBER', created: new Date(user.created), pages:{committed:0, approved:0, submitted:0,inprogress:0, assigned:0}}];
            newUser.save(function(err){
              nusers+=1;
              importedusers.push(newUser._id)
              callback(err);
            })
        }
      })
    }, function(err) { //add all the new users to the community
      if (err) res.json({error:err});
      else {
        Community.update({abbr:cAbbrev}, {$push:{members:{$each:importedusers}}}, function(err){
          if (!err) res.json({nusers:nusers, error:"none"});
          else res.json({error:err})
        });
      }
    });
  })
});

router.post('/saveIIIFDoc', function(req, res, next){
  var pages=req.body;
  var doc_id=req.query.document;
  var community=req.query.community;
  var myDoc={};
  var nPages=0;
  //just save them all
  async.map(pages, function(page, callback) {
    Doc.update({_id:ObjectId(page._id)}, {$set: {image:page.image}}, function(err, doc){
      nPages+=1;
      callback(err);
    })
  }, function(err) {
    Doc.findOne({_id:ObjectId(doc_id)}, function(err, doc){
      res.json({npages:nPages,document:doc});
    })
  });
});

router.post('/saveManyPagesDoc', function(req, res, next) {
   var pages=req.body;
   var doc_id=req.query.document;
   var community=req.query.community;
   var user=req.user;
   var myDoc={};
   async.waterfall([
     function(cb) {
       var page_ids=[];
       for (var i=0; i<pages.length; i++) {
         var p_id=ObjectId();
         pages[i]._id=p_id;
         page_ids.push(p_id);
       };
       Doc.update({_id:ObjectId(doc_id)}, {$set: {children: page_ids}}, function(err, doc){
           cb(err);
       });
     },
     function(cb) {
       for (var i=0; i<pages.length; i++) {
         pages[i]._id=ObjectId(pages[i]._id);
         pages[i].tasks=pages[i].entities=pages[i].children=[];
         pages[i].ancestors=[ObjectId(doc_id)];
         pages[i].meta={user:ObjectId(user._id), committed: new Date()};
       }
       Doc.insertMany(pages, function(result){
         cb(null);
       })
     },
     function(cb) {  //find parent tei
       TEI.findOne({"docs.0": ObjectId(doc_id), name:"text"}, function(err, tei){
           cb(err, tei._id);
       });
     },
     function(text_id, cb) { //create the teis for this Document
       var teis=[];
       var tei_ids=[];
       for (var i=0; i<pages.length; i++) {
         var tei_id=ObjectId();
         teis.push({_id:tei_id, name:"pb", attrs:{n: pages[i].name}, community:community, docs:[ObjectId(doc_id), pages[i]._id], entityChildren:[], children:[], ancestors:[text_id]});
         tei_ids.push(tei_id);
       }
       TEI.insertMany(teis, function(result) {
         cb(null,tei_ids);
       })
     },
     function(tei_ids, cb) {
       TEI.update({"docs.0": ObjectId(doc_id), name:"text"}, {$set: {children: tei_ids}}, function(err, doc){
           cb(err);
       });
     },
     function(cb) {
       Doc.findOne({_id:ObjectId(doc_id)}, function(err, doc){
         myDoc=doc;
         cb(err);
       });
     }
   ], function (err) {
     if (err) res.json({"success":false, error:err});
     else res.json({document:myDoc, npages: pages.length});
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

function getTeiEl(page, callback) {
  TEI.findOne({docs: ObjectId(page), name:"pb"}, function(err, pageTei){
    if (err) callback(err);
    else callback(null, pageTei);
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

function removeAllDocs(req, res, deleteCommunity) {
    var ndocs=0, ndocels=0, nentels=0, cAbbrev="", nTEIels=0, ncollels=0, npagetrans=0;
    //delete all docs all entitiees all revisions...
    Community.findOne({_id: req.query.id}, function(err, community) {
      cAbbrev=community.abbr;
      ndocs=community.documents.length;
      async.parallel([
        function(cb1) {
          Doc.collection.remove({community: cAbbrev}, function (err, result){
            ndocels+=result.result.n;
            cb1(err);
          });
        },
        function(cb1) {
            TEI.collection.remove( {community: cAbbrev}, function (err, result){
              nTEIels=result.result.n;
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
          Collation.remove({community: cAbbrev}, function (err, result){
            ncollels=result.result.n;
            cb1(err);
          });
        },
        function(cb1) {
          Revision.remove({community: cAbbrev}, function (err, result){
            npagetrans=result.result.n;
            cb1(err);
          });
        },
        function(cb1) {
          User.collection.update({"memberships.community":ObjectId(req.query.id)}, {$set: {"memberships.$.pages.assigned":0, "memberships.$.pages.committed":0, "memberships.$.pages.approved":0, "memberships.$.pages.submitted":0, "memberships.$.pages.inprogress":0}}, {multi: true}, cb1);
        },
        function(cb1) {
          if (!deleteCommunity) Community.update({_id:req.query.id}, {$set: {documents:[], entities:[]}}, cb1);
          else {  //delete the community, and all membership references to it
            Community.remove({_id: ObjectId(req.query.id)}, function (err, result){
  //            console.log("result "+result.result.n)
              User.collection.update({"memberships.community":ObjectId(req.query.id)}, {$pull:{'memberships':{'community':ObjectId(req.query.id)}}}, {multi: true}, cb1);
             })
          }
        },
      ], function(err) {
          res.json({"ndocs":ndocs, "ndocels": ndocels, "nentels": nentels, "nTEIels": nTEIels, "npagetrans": npagetrans, "ncollels": ncollels});
      });
    });
}

router.post('/deleteUser', function(req, res,next){
  User.findOne({_id:ObjectId(req.query.id)}, function(err, user){
    //remove from all communities..
    async.map(user.memberships, function(membership, callback) {
      Community.collection.update({_id:membership.community}, {$pull:{members:user._id}}, function(err, result){
        callback(err);
      });
    }, function (err){
      //remove the user here
      User.collection.remove({_id:ObjectId(req.query.id)}, function(err, result){
        res.json({result:err})
      });
    });
  });
});

//this we now simplify drastically. Just remove all elements with community:CTP field
//this will get rid of all docs, teis. revisions: have to use community id instead
router.post('/deleteAllDocs', function(req, res, next) {
  if (req.query.deleteComm=="false")
    removeAllDocs(req, res, false);
  else if (req.query.deleteComm=="true")
    removeAllDocs(req, res, true);
  else res.json({"error":"Something wrong in call "})
});


function getPagesInDocs (pageID, callback) {
  Doc.findOne({_id: ObjectId(pageID)}, function(err, page) {
    callback(err, page.children);
  });
}

router.post('/deletePage', function(req, res, next) {
  //this one just eliminates page from docs and teis and as a child of text and document
  //only called when we are deleting a page in order to add it back in by docservice
  async.waterfall([
    function (cb) {
      Doc.collection.remove({_id: ObjectId(req.query.pageid)}, function(err, result) {
        if (err || result.result.n==0) cb("error", []);
        else cb(null, []);
      })
    },
    function (argument, cb) {
      Doc.collection.update({_id: ObjectId(req.query.docid)}, {$pull:{children: ObjectId(req.query.pageid)}}, function(err, result) {
        if (err || result.result.n==0) cb("error", []);
        else cb(null, []);
      })
    },
    function(argument, cb) {
      TEI.findOne({name:"pb", docs: ObjectId(req.query.pageid)}, function (err, pbEl){
        if (err || !pbEl) cb("error", []);
        else {
          TEI.collection.remove({_id:pbEl._id}, function (err, result){
            if (err || result.result.n==0) cb("error", []);
            else cb(null, pbEl);
          });
        }
      });
    },
    function (pbTei, cb) {
      //take this out of the text element
        TEI.collection.update({_id: ObjectId(pbTei.ancestors[0]), name:"text"}, {$pull: {children: pbTei._id}}, function (err) {
          if (err) cb(err, []);
          else cb(null, []);
        });
    }
  ], function(err, results) {
    res.json({"success":1});
  });
});

//just find a text element in this document
router.post('/isDocTranscript', function(req, res, next) {
  TEI.findOne({name:"#text", "docs.0": ObjectId(req.query.docid)}, function(err, thistei) {
//    console.log(thistei);
    if (thistei) res.json({"isDocText": true});
    else res.json({"isDocText": false});
  });
});

var globalTextEl=null;


router.post('/updateDbJson', function(req, res, next) {
  var collection=req.query.collection;
//  console.log("changing json1")
  var param1=req.body[0];
  var param2=req.body[1];
//  console.log("changing json")
//  console.log(param1._id);
  if (param1.hasOwnProperty('_id')) {
//    console.log("updating");
//    param1={_id:}
    param1._id=ObjectId(param1._id);
//    console.log(param1);
  }
  if (collection=="Community") {
      Community.collection.update(param1, param2, function(err, result){
        if (err) res.json("fail");
        else res.json("success");
      })
  }
  if (collection=="Document") {
    Doc.collection.update(param1, param2, function(err, result){
  //    console.log(param1);
  //    console.log(param2);
  //    console.log(result);
      if (err) res.json("fail");
      else res.json("success");
    })
  }
});

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

//load all the witnesses in one operation
router.post('/getCEWitnesses', function(req, res, next) {
  console.log(req.query.community);
  console.log(req.body.witnesses);
  console.log(req.body.base);
  console.log(req.body.entity);
  var witnesses=req.body.witnesses;
  var community=req.query.community;
  var base=req.body.base;
  var entity=req.body.entity;
  async.mapSeries(witnesses, function(witness, callback){
/*    getCEWitness(witness, community, entity, function (err, result){
      if (result=={}) console.log(witness+" empty");
      callback(err, result)
    }) */
//    console.log("looking for witness "+witness);
    async.waterfall([
      function(cb) {
        Doc.findOne({community: community, name: witness, ancestors:{$size:0}}, function (err, myDoc) {
          if (err) {
//            console.log("can't find witness "+witness)
            cb(err, {});
          }
          else {
            cb(null, myDoc);
          }
        });
      },
      function (myDoc, cb) {
        TEI.find({docs: myDoc._id, entityName: entity}, function(err, teis){
          if (err) cb(err, []);
          else {  //have to deal with case where this entity is absent from the document
            if (teis.length==0) {
              cb("no witness", {});
            } else {  //we have to deal with multiple texts for this witness
//              console.log("number versions "+teis.length)
              var content='{"_id": "'+witness+'_'+entity+'", "context": "'+entity+'","tei":"", "transcription_id": "'+witness+'","transcription_siglum": "'+witness+'","siglum": "'+witness+'"';
              var teiContent={"content":""}; //make this a loop if more than one wit here
              content+=',"witnesses":['
              var counter=0;
              async.mapSeries(teis, function(thisTei){
                const cb2 = _.last(arguments);
                teiContent={"content":""};
                loadTEIContent(thisTei, teiContent).then(function (){
                  if (teiContent.content!="") {
                    if (counter>0) {
                      content+=","+makeJsonList(teiContent.content, witness+"("+counter+")")
                    }
                    else content+=makeJsonList(teiContent.content, witness);
                    counter++;
                    cb2(null);
                  } else cb2(null);
                });
              }, function(err) {
                content+=']}';
                cb(null, content);
              })
            }
          }
        });
      }
    ], function (err, result){
      if (err=="no witness") {
//        console.log("no text found for "+witness)
        callback(null, {})
      }
      else callback(err, result);
    })
  }, function(err, results) {
//    console.log(results);
    if (err) res.json({baseHasText: true, result: [], success:false})
    else res.json({baseHasText: true, result: results, success:true})
  });
});

function getCEWitness(witness, community, entity, callback) {
    async.waterfall([
      function(cb) {
        Doc.findOne({community: community, name: witness, ancestors:{$size:0}}, function (err, myDoc) {
          if (err) cb(err, {});
          else {
            cb(null, myDoc);
          }
        });
      },
      function (myDoc, cb) {
        TEI.find({docs: myDoc._id, entityName: entity}, function(err, teis){
          if (err) cb(err, []);
          else {  //have to deal with case where this entity is absent from the document
            if (teis.length==0) {
              cb("no witness", {});
            } else {  //we have to deal with multiple texts for this witness
//              console.log("number versions "+teis.length)
              var content='{"_id": "'+witness+'_'+entity+'", "context": "'+entity+'","tei":"", "transcription_id": "'+witness+'","transcription_siglum": "'+witness+'","siglum": "'+witness+'"';
              var teiContent={"content":""}; //make this a loop if more than one wit here
              content+=',"witnesses":['
              var counter=0;
              async.mapSeries(teis, function(thisTei){
                const cb2 = _.last(arguments);
                teiContent={"content":""};
                loadTEIContent(thisTei, teiContent).then(function (){
                  if (teiContent.content!="") {
                    if (counter>0) {
                      content+=","+makeJsonList(teiContent.content, witness+"("+counter+")")
                    }
                    else content+=makeJsonList(teiContent.content, witness);
                    counter++;
                    cb2(null);
                  } else cb2(null);
                });
              }, function(err) {
                content+=']}';
                cb(null, content);
              })
            }
          }
        });
      }
    ], function (err, result){
      if (err=="no witness") {
        console.log("no text found for "+witness)
        callback(null, {})
      }
      else callback(err, result);
    })
}

router.get('/getDocNames', function(req, res, next) {
  var community=req.query.community;
  Community.findOne({_id: ObjectId(community)}, function(err, myCommunity){
    async.map(myCommunity.documents, function(myDoc, cb){
      Doc.findOne({_id: myDoc}, function (err, thisDoc){
        cb(err, {name: thisDoc.name, npages: thisDoc.children.length });
      })
    }, function (err, results){
      console.log("finished")
      res.json(results);
    })
  });
});

//hereon: collation editor calls
router.get('/cewitness', function(req, res, next) {
//  console.log(req.query.witness);
//we have to find the entities in this doc. First, find the doc in this community, then all teis in this doc which are this entity
//along the way: construct the full colleditor form of this doc
//get the docid first:
  async.waterfall([
    function (cb) {
      Community.findOne({'abbr':req.query.community}, function (err, myCommunity) {
        if (err) cb(err, []);
        else cb(null, myCommunity.documents);
      });
    },
    function (myDocs, cb) {
      Doc.findOne({_id: {$in: myDocs}, name: req.query.witness}, function (err, myDoc) {
        if (err) cb(err, []);
        else {
          cb(null, myDoc);
        }
      })
    },
    function (myDoc, cb) {
      //check for more tnan one instance...
//        console.log(req.query.witness);
//        console.log("looking for wit");
//        console.log(myDoc);
        TEI.find({docs: myDoc._id, entityName: req.query.entity}, function(err, teis){
          if (err) cb(err, []);
          else {  //have to deal with case where this entity is absent from the document
            if (teis.length==0) {
              cb("no witness", []);
            } else {  //we have to deal with multiple texts for this witness
//              console.log("number versions "+teis.length)
              var content='{"_id": "'+req.query.witness+'_'+req.query.entity+'", "context": "'+req.query.entity+'","tei":"", "transcription_id": "'+req.query.witness+'","transcription_siglum": "'+req.query.witness+'","siglum": "'+req.query.witness+'"';
              var teiContent={"content":""}; //make this a loop if more than one wit here
              content+=',"witnesses":['
              var counter=0;
              async.mapSeries(teis, function(thisTei){
                const cb2 = _.last(arguments);
//                console.log(counter+" "+thisTei)
                teiContent={"content":""};
                loadTEIContent(thisTei, teiContent).then(function (){
                  if (teiContent.content!="") {
                    if (counter>0) {
                      content+=","+makeJsonList(teiContent.content, req.query.witness+"("+counter+")")
                    }
                    else content+=makeJsonList(teiContent.content, req.query.witness);
                    counter++;
                    cb2(null);
                  } else cb2(null);
                });
              }, function(err) {
                content+=']}';
                cb(null, content);
              })
            }
          }
        });
    },
  ], function(err, result) {
    if (err=="no witness" || err) {
        res.sendStatus(404); //this feels like a hack but it gives the desired result
      }  else {
//      console.log("ms is"+result);
      //save it to the tei for this entity in this ms...
//      console.log("to save it we need ms "+req.query.witness+" community "+req.query.community+" entity "+req.query.entity)
      res.json(JSON.parse(result));
    }
  });
});

//turns our content string into collation editor ready json
function makeJsonList(content, witness) {
  var thistext="";
  //remove line breaks,tabs, etc
//  thistext+=content.replace(/(\r\n|\n|\r)/gm,"");
//  console.log("before "+content)
  content=content.replace(/(\r\n|\n|\r)/gm,"");
  content=content.replace(/<note(.*?)<\/note>/gm,"");
  content=content.replace(/(\t)/gm," ");
  content=content.replace(/  +/g, ' ');
  content=content.replace(/"/g, "\'\'");   //this is a hack. Can't figure out how to handle " in strings
  content=content.replace(/'/g, "\'");
//  console.log("after "+content)
  content=content.trim();
//  console.log("let's start here "+content);
  var myWitRdgs=[];
  //is there an app here..
  if (content.indexOf("<app>")!=-1) {
    //ok we got app elements
//    console.log("got some apps");
     var myRdgTypes=FunctionService.getRdgTypes(content);
     //myRdgTypes);
     var myWitRdgs=FunctionService.createRdgContent(content, myRdgTypes, witness);
//     console.log("back in api "); console.log(myWitRdgs);
     //now, manufacture a string for each app
  }
  if (myWitRdgs.length==0)
     myWitRdgs.push({witness: witness, content: content})
  else {
    for (var j=0; j<myWitRdgs.length; j++) {
      myWitRdgs[j].witness=witness+"-"+myWitRdgs[j].type;
    }
  }
//  console.log(myWitRdgs);
  //ok, process into an array with word and  elements
  for (var j=0; j<myWitRdgs.length; j++) {
    thistext+='{"id":"'+myWitRdgs[j].witness+'","tokens":[';
//    console.log("about to call CE array :"+thistext);
    var myWords=FunctionService.makeCeArray(myWitRdgs[j].content);
//    console.log(thistext);
//    console.log(myWords);
  //  var myWords=content.split(" ");
    for (var i = 0; i < myWords.length; i++) {
      var index=(i+1)*2;
      //also put uncap version of word in rule match too
      var rule_match_cap="";
      if (myWords[i].word!=(myWords[i].word.toLowerCase()))
        rule_match_cap=',"'+myWords[i].word.toLowerCase()+'"';
      var rule_match='"rule_match":["'+myWords[i].word+'"'+rule_match_cap+']';
      var token = '"t":"'+myWords[i].word+'"';
      if (myWords[i].origword=="") var original='"original":"'+myWords[i].word+'"';
      else var original='"original":"'+myWords[i].origword+'"';
      if (myWords[i].expanword=="") var expanded="";
      else var expanded=',"expanded":"'+myWords[i].expanword+'"';
      if (myWords[i].xmlword=="") var xmlWordStr="";
      else var xmlWordStr=',"fullxml":"'+myWords[i].xmlword.replace(" ","&nbsp;")+'"';
      if (myWords[i].punctbefore=="") var punctbeforeStr="";
      else var punctbeforeStr=',"pc_before":"'+myWords[i].punctbefore.replace(" ","&nbsp;")+'"';
      if (myWords[i].punctafter=="") var punctafterStr="";
      else var punctafterStr=',"pc_after":"'+myWords[i].punctafter.replace(" ","&nbsp;")+'"';
      //test: are there expansions for this word? does this word contain <am>/<ex>? look for xml forms too

      if (myWords[i].expanword!="" && myWords[i].xmlword!="") {
        var rmExword="";
        var rmExmlword="";
        var expanword=myWords[i].expanword;
        var xmlword=myWords[i].xmlword;
        if (expanword!=expanword.toLowerCase()) rmExword=',"'+expanword.toLowerCase()+'"';
        if (xmlword!=xmlword.toLowerCase()) rmExmlword=',"'+xmlword.toLowerCase()+'"';
        token='"t":"'+myWords[i].origword+'"';
        rule_match='"rule_match":["'+expanword+'","'+myWords[i].origword+'","'+xmlword+'"'+rmExword+rmExmlword+']';
      }
      else if (myWords[i].xmlword!="") {
        var rmExmlword="";
        if (myWords[i].word!=myWords[i].word.toLowerCase()) rmExmlword=',"'+myWords[i].word.toLowerCase()+'"';
        token='"t":"'+myWords[i].word+'"';
        rule_match='"rule_match":["'+myWords[i].word+'","'+myWords[i].xmlword+'"'+rmExmlword+']';
      }
      else if (myWords[i].expanword!="") {
        var rmExword="";
        var expanword=myWords[i].expanword;
        if (expanword!=expanword.toLowerCase()) rmExword=',"'+expanword.toLowerCase()+'"';
        token='"t":"'+myWords[i].origword+'"';
        rule_match='"rule_match":["'+myWords[i].expanword+'","'+myWords[i].word+'","'+myWords[i].origword+'"'+rmExword+']';
      }
      thistext+='{"index":"'+index+'",'+token+","+rule_match+',"reading":"'+myWitRdgs[j].witness+'",'+original+expanded+xmlWordStr+punctbeforeStr+punctafterStr+'}';
      if (i<myWords.length-1) thistext+=',';
    }
    thistext+=']}'
    if (j<myWitRdgs.length-1) thistext+=',';
  }
//  console.log(thistext);
  return(thistext);
}

router.post('/isAlreadyCommunity', function(req, res, next) {
  Community.findOne({$or: [{abbr: req.query.abbr}, {name: req.query.name}]}, function(err, community) {
//    console.log("checking for community")
    if (!community) {
      res.json({success: 1});
    } else {
//        console.log(community);
        var message="There is already a community with the name \""+req.query.name+"\" and/or abbreviation \""+req.query.abbr+"\"."
        res.json({success:0, message: message});
      }
  });
});

router.post('/baseHasEntity', function(req, res, next) {
  TEI.findOne({docs: ObjectId(req.query.docid), entityName: req.query.entityName}, function(err, tei){
//    console.log(tei);
    if (!tei) res.json({success: 0})
    else res.json({success: 1})
  });
});

router.post('/markEntityCollated', function(req, res, next){
//  console.log("mark collation for "+req.query.entity);
  Entity.update({entityName:req.query.entity, isTerminal:true}, {$set:{hasCollation:true}}, function (err, result){
//    console.log(err);
    res.json({status:true});
  })
})

router.post('/putCollation', function(req, res, next){
  //if there is one already, updates, if not, insertedI
//  console.log("saving the collation now");
//  console.log(req.body);
  Collation.update({community:req.query.community, entity:req.query.entity, id:req.query.community+'/'+req.query.entity+'/'+req.query.status, model:"collation", status:req.query.status}, {$set: {ce: req.body.collation.ce}}, {upsert: true}, function(err) {
//    console.log(err);
    if (!err) res.json({success:true}) ;
    else res.json({success:false});
  });
});

router.post('/getRulesByIds', function(req, res, next){
  Collation.find({community: req.query.community, id: {$in: req.body.findByIds}}, function(err, rules){
    if (rules.length) {
      var rulesByIds=[];
      rules.forEach(function(rule) {
        rulesByIds.push(JSON.parse(rule.ce));
      });
      res.json(rulesByIds);
    } else res.json([]);
  })
});


router.get('/isAlreadyCollation', function(req, res, next) {
  console.log("entity "+req.query.entity+" status "+req.query.status+" commiunity "+req.query.community);
  Collation.find({entity:req.query.entity, model:"collation", status: req.query.status, community: req.query.community}, function(err, found){
//    console.log(err);
    if (found.length>0) res.json({status:true});
    else res.json({status:false});
  })
});

//for this verse, pull everu case of an exception in the global rules..ie find all globals, check if this verse is an exception
router.get('/getRuleExceptions', function(req, res, next){
  Collation.find({community:req.query.community, scope: 'always'}, function(err, rules) {
    if (rules.length) {
      var ruleExceptions=[];;
      rules.forEach(function(rule) {
          //is there an exception for this verse here...
  //        console.log("rule exceptions");
  //        console.log(rule);
          var thisRule = JSON.parse(rule.ce);
  //        console.log(thisRule)
			    if (thisRule.exceptions && thisRule.exceptions.indexOf(req.query.entity) !== -1) {
						ruleExceptions.push(thisRule);
			    }
      });
//      console.log(ruleExceptions);
      res.json(ruleExceptions);
    }
    else res.json([]);
  })
});

router.get('/loadSavedCollation', function(req, res, next) {
  Collation.findOne({id:req.query.id}, function(err, result) {
    if (!err) res.json({"status": true, "result": result.ce});
    else res.json({"status":false});
  });
});

router.get('/getRegularizationRules', function(req, res, next){
    //we don't want to get
    var rulesFound=[];
    Collation.find({community:req.query.community, model:"regularization",$or:  [ { entity: req.query.entity }, { scope: 'always' } ]}, function(err, rules){
      if (rules.length) {
         rules.forEach(function(rule) {
           // exceptions handled back in calling function (coould do here; might slightly reduce network traffic)
           rulesFound.push(rule.ce)
        });
      }
      res.json(rulesFound);
    });
});


// this removes BOTH global and local regularization rules

router.post('/deleteRules', function (req, res, next) {
  Collation.remove({id: {$in:req.body.delete}, community:req.query.community, model:"regularization"}, function(result){
    res.json({success:0});
  })
});

router.post('/addCEGlobalExceptions', function (req, res, next) {
//  console.log(req.body);
  Collation.find({id:{$in: req.body.exceptions}, model:"regularization"}, function(err, exceptions){
//    console.log(exceptions.length);
//    res.json({success:0})
    async.each(exceptions,
      function(exception, callback) {
        var ce=JSON.parse(exception.ce);
  //      console.log(ce);
        if (ce.hasOwnProperty('exceptions')) {
                if (ce.exceptions.indexOf(req.query.entity) === -1 && req.query.entity) {
                  ce.exceptions.push(req.query.entity);
                }
            } else {
                ce.exceptions = [req.query.entity];
            }
        Collation.updateOne({id:exception.id, scope:'always', model:"regularization"}, {$set: {ce: JSON.stringify(ce)}}, function (err, result){
          callback(err)
        })
      },
      function(err) {
        res.json({success:0})
      });
  });
});

//pass in the entire addition array to do this with one internet call
//bit of a wrinkle here... could be we are trying to update an exception to a global rule
//in that case: delete the existing global rule then add the new one with its new ce
router.post('/putCERuleSet', function(req, res, next) {
  //so let's check -- only affects removal of exceptions to always rules.
  //in these cases, we need to remove the old version of the always rule before adding the new one
//  console.log('add these')
//  console.log(req.body.ruleSet);
  var deleteRules=[];
  for (var i=0; i<req.body.ruleSet.length; i++) {
    if (req.body.ruleSet[i].scope=="always") deleteRules.push(req.body.ruleSet[i].id);
  }
//  console.log(deleteRules);
  if (deleteRules.length>0) {
    Collation.remove({id: {$in: deleteRules}, model:"regularization"}, function(result){
      Collation.insertMany(req.body.ruleSet, function(result){
        res.json({success: 0});
      });
    });
  } else {
    Collation.insertMany(req.body.ruleSet, function(result){
      res.json({success: 0});
    });
  }
  //how about just this-- remove all records which have same globalid...? that should work...


  //let's make an entry in the collation table...
//  Collation.update({'entity':req.query.entity, 'id':req.query.id}, {$set: {ce: req.body.resource, community: req.query.community, 'scope':req.query.scope}}, { upsert: true }, function (err, result){
//      res.json({success: 0})
//  })
});

// wrinkle: populate witnesses field from documents array...
//now: use what is in ceconfig witnesses
//NOTE if we get an error here it is because there is a document in the witness list which no longer exists
router.get('/ceconfig', function(req, res, next) {
  Community.findOne({abbr: req.query.community}, function(err, community) {
    //now get the witnesses
//    console.log("looking for ce "+community)
//  if ceconfig.witnesses is not empty -- use it!!!
    if (community.ceconfig.witnesses && community.ceconfig.witnesses.length>0) res.json(community.ceconfig);
    else {
      async.mapSeries(community.documents, function(mydocument, callback) {
//        console.log(mydocument)
        Doc.findOne({_id: ObjectId(mydocument)}, function(err, myDoc){
  //        console.log(myDoc.name)
          return callback(err, myDoc.name)
        })
      }, function(err, results) {
  //do we have a witness which corresponds to the selected base? if so, no problem
  //else: make first doc the base
  //this one not needed now -- we intercept before we get to this point
  /*      var isBaseWit=results.filter(function (obj){return obj== community.ceconfig.base_text;})[0];
        console.log(community.ceconfig.base_text);
        if (!isBaseWit) community.ceconfig.base_text=results[0]; */
        community.ceconfig.witnesses=results;
        community.ceconfig.project=community.name;
  //      console.log(community.ceconfig);
        res.json(community.ceconfig);
      });
    }
  });
});

module.exports = router;
