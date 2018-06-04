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
  if (authparts[0]!='urn') res.status(400).send('URI protocol "'+authparts[0]+'" not recognized. "urn" expected');
  else if (authparts[1]!='det') res.status(400).send('URN Namespace Identifier "'+authparts[1]+'" not recognized. "det" expected');
  else if (authparts[2]!='tc') res.status(400).send('URN det naming authority prefix "'+authparts[2]+'" not recognized. "tc" expected');
  else if (authparts[3]!='usask') res.status(400).send('URN det naming authority organization "'+authparts[3]+'" not recognized. "usask" expected');
  else {
    //ok so far.. now, is this a public community?
    // we coujld be asking for all communities,in which case community is *
    if (authparts[4]=="*") {
        Community.find({public:true}, function(err, communities){
          var mycommunities=[];
          communities.forEach(function(community){ mycommunities.push({community:community.name})});
          res.json(mycommunities);
        });
    } else {
      Community.findOne({abbr:authparts[4], public:true}, function(err, community){
        console.log(community)
        if (!community) res.status(400).send('The community "'+authparts[4]+'" is not known on this Textual Communities server, or is not publicly available.');
        else { //fun starts! we got a community. Now, what do we have??? are we looking for just entity, just document, or text
          res.send(authparts+nameparts);
        }
      });
    }
  }
});

module.exports = router;
