var express = require('express')
  , _ = require('lodash')
  , async = require('async')
  , router = express.Router()
  , models = require('../models')
  , Community = models.Community
  , User = models.User
;

var Resource = function(opts) {
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
      .get(this.detail())
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
      , query
    ;
    query = this.model.find(find);
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
  list: function() {
    return _.bind(function(req, res, next) {
      var query = this.getQuery(req);
      async.waterfall([
        query.exec,
      ], this.sendData(req, res, next));
    }, this);
  },
  create: function() {
    return _.bind(function(req, res) {
      var obj = new this.model(req.body);
      obj.save(function(err) {
        if (err) {
          res.send(err);
        } else {
          res.json(obj);
        }
      });
    }, this);
  },
  detail: function() {
    return _.bind(function(req, res) {
      var query = this.getQuery(req).findOne({
        _id: req.params[this.options.id]
      });
      query.exec(function(err, obj) {
        if (err) {
          res.send(err);
        } else {
          res.json(obj);
        }
      });
    }, this);
  },
  update: function() {
    return function() {
      
    }
  },
  remove: function() {
    return function() {
      
    }
    
  },
  sendData: function(req, res, next) {
    return function(err, data) {
      if (err) {
        next(err);
      } else {
        res.json(data);
      }
    }
  }
});


var CommunityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, _.assign({model: Community}, opts));
}, {
  create: function() {
    return function(req, res, next) {
      var obj = new this.model(req.body);
      var user = req.user;
      async.waterfall([
        obj.save,
        function(cb) {
          user.memberships.push({
            community: obj._id,
            role: User.LEADER,
          });
          user.save(cb);
        }
      ], function(err) {
        if (err) {
          next(err);
        } else {
          res.json(obj);
        }
      });

      obj.save(function(err) {
        if (err) {
          next(err);
        } else {
                  }
      });
    }
   
  }

});
new Resource(router, 'communities', {
  model: Community, id: 'community', 
  create: function(req, res) {
    if (req.isAuthenticated()) {
      var obj = new this.model(req.body);
      obj.save(function(err) {
        if (err) {
          res.send(err);
        } else {
          req.user.memberships.push({
            community: obj._id,
            role: User.LEADER,
          });
          req.user.save(function() {
            res.json(obj);
          });
        }
      });
    }
  }
});

var userResource = new Resource({model: User});
userResource.serve(router, 'users', {id: 'user'});

new CommunityResource({model: Community}).serve(router, 'communities', {
  id: 'community',
});

router.get('/auth', function(req, res) {
  if (req.isAuthenticated()) {
    req.params.user = req.user._id;
    next();
  } else {
    res.json({});
  }
}, userResource.detail());


module.exports = router;
