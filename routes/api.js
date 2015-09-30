var express = require('express')
  , _ = require('lodash')
  , async = require('async')
  , router = express.Router()
  , models = require('../models')
  , Community = models.Community
  , User = models.User
;

var Resource = function(model, opts) {
  this.model = model;
  this.options = _.assign({}, opts);
};
_.assign(Resource.prototype, {
  serve: function(router, name, opts) {
    var options = _.assign({
      id: 'id',
    }, this.options, opts);

    router.route('/' + name)
      .get(this.list())
      .post(this.create())
    ;

    router.route('/' + name + '/:' + options.id)
      .get(this.detail(options))
      .put(this.update())
      .delete(this.remove())
    ;
  },
  getQuery: function(req) {
    var urlQuery = req.query || {}
      , find = JSON.parse(urlQuery.find || '{}')
      , select = JSON.parse(urlQuery.select || 'null')
      , sort = JSON.parse(urlQuery.sort || 'null')
      , fields = JSON.parse(urlQuery.fields || 'null')
      , model = this.model
      , query
    ;
    query = model.find(find);
    if (select) {
      query = query.select(select);
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (fields) {
      query = query.populate(fields);
    }
    return query;
  },
  save: function(obj, req, res, next) {
    return function(cb) {
      obj.save(cb);
    };
  },
  sendData: function(req, res, next) {
    return function(err, data) {
      if (err) {
        next(err);
      } else {
        res.json(data);
      }
    };
  },
  list: function() {
    return _.bind(function(req, res, next) {
      var query = this.getQuery(req);
      async.waterfall([
        _.bind(query.exec, query),
      ], this.sendData(req, res, next));
    }, this);
  },
  create: function() {
    return _.bind(function(req, res, next) {
      var obj = new this.model(req.body);
      async.waterfall([
        this.save(obj, req, res, next),
      ], this.sendData(req, res, next));
    }, this);
  },
  detail: function(options) {
    return _.bind(function(req, res, next) {
      var query = this.getQuery(req).findOne({
        _id: req.params[options.id]
      });
      async.waterfall([
        _.bind(query.exec, query),
      ], this.sendData(req, res, next));
    }, this);
  },
  update: function() {
    return function() {
      
    };
  },
  remove: function() {
    return function() {
      
    };
    
  },
});


var CommunityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Community, opts);
}, {
  save: function(obj, req, res, next) {
    return function(cb) {
      var user = req.user;
      async.waterfall([
        _.bind(obj.save, obj),
        function(cb) {
          user.memberships.push({
            community: obj._id,
            role: User.LEADER,
          });
          user.save(cb);
        },
      ], cb);
    };
  },
});

var userResource = new Resource(User);
userResource.serve(router, 'users', {id: 'user'});

new CommunityResource().serve(router, 'communities', {id: 'community'});

router.get('/auth', function(req, res, next) {
  if (req.isAuthenticated()) {
    req.params.user = req.user._id;
    next();
  } else {
    res.json({});
  }
}, userResource.detail({id: 'user'}));


module.exports = router;
