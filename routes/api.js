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
  , TCMailer = require('../TCMailer')
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
      TCMailer.nodemailerMailgun.sendMail({
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
  console.log(action);
  if (!validateAction(action)) {
    return next({error: 'Action format error'});
  }
  switch (action.type) {
    case 'request-membership':
      requestMembership(action, function(err, _action) {
      console.log('requestMembership finish');
        console.log(err);
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
  console.log(req.files);
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
  TCMailer.nodemailerMailgun.sendMail(req.body, function(err, status) {
    if (!err) {
      res.json(status);
    } else {
      next(err);
    }
  });
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
      console.log(err);
      err = {
        name: err.name,
        message: `There is already a community with the ${msg[1]} ${msg[2]}`,
      };
    }
    res.json(err);
  }
});

module.exports = router;

/*
<text>
<body>
  <div n="div1">
    <pb n="1r"/>
    <head n="h1"> head </head>
    <ab n="ab1"> ab1 </ab>
    <ab n="ab2"> ab2 </ab>
    <lb/>
    <l n="1"> hello <lb/> world </l>
    <lb/>
  </div>
  <div n="div2">
    <l n="1">
      foo
      <pb n="1v"/>
      <lb/>
      bar
    </l>
  </div>
</body>
</text>

<text>
<body>
  <div n="div1">
    <pb n="1r"/>
    <head n="h1"> head </head>
    <ab n="ab1"> ab1 </ab>
    <ab n="ab2"> ab2 </ab>
    <lb n="1r1"/>
    <l n="1"> hello <lb  n="1r2"/> world </l>
    <lb  n="1r3"/>
     <l n="2"> foo  bar </l>
    <lb  n="1r4"/>
     <l n="3"> good  good </l>
  </div>
  <div n="div2">
        <lb n="1r5"/>
    <l n="1">
      foo

      <pb n="1v"/>
      <lb n="1v1"/>
      bar
    </l>
    <pb n="2r"/>
<lb n="2r1"/>
     <l n="1"> see <lb n="2r2"/> you</l>
  </div>
</body>
</text>

 */
