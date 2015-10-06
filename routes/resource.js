var _ = require('lodash')
  , async = require('async')
;

var Resource = function(model, opts) {
  var isAuthenticated = _.bind(this.isAuthenticated, this);
  this.model = model;
  this.options = _.assign({
    auth: {
      create: isAuthenticated,
      update: isAuthenticated,
      delete: isAuthenticated,
    }
  }, opts);
};
_.assign(Resource.prototype, {
  serve: function(router, name, opts) {
    var options = _.assign({
      id: 'id',
    }, this.options, opts);

    router.route('/' + name)
      .get(this.list())
      .post(options.auth.create, this.create())
    ;

    router.route('/' + name + '/:' + options.id)
      .get(this.detail())
      .put(options.auth.update, this.update())
      .patch(options.auth.update, this.patch())
      .delete(options.auth.delete, this.remove())
    ;
  },
  isAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      console.log(req.user);
      next();
    } else {
      res.sendStatus(403);
    }
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
  beforeCreate: function(req, res, next) {
    var obj = new this.model(req.body);
    return function(cb) {
      cb(null, obj);
    };
  },
  beforeUpdate: function(req, res, next) {
    return function(obj, cb) {
      obj.set(req.body);
      cb(null, obj);
    };
  },
  execSave: function(req, res, next) {
    return function(obj, cb) {
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
      async.waterfall([
        this.beforeCreate(req, res, next),
        this.execSave(req, res, next),
      ], this.sendData(req, res, next));
    }, this);
  },
  detail: function() {
    return _.bind(function(req, res, next) {
      var query = this.getQuery(req).findOne({
        _id: req.params[this.options.id]
      });
      async.waterfall([
        _.bind(query.exec, query),
      ], this.sendData(req, res, next));
    }, this);
  },
  update: function() {
    return _.bind(function(req, res, next) {
      var query = this.getQuery(req).findOne({
        _id: req.params[this.options.id]
      });
      async.waterfall([
        _.bind(query.exec, query),
        this.beforeUpdate(req, res, next),
        this.execSave(req, res, next),
      ], this.sendData(req, res, next));
    }, this);
  },
  patch: function() {
    return _.bind(function(req, res, next) {
      var query = this.getQuery(req).findOne({
        _id: req.params[this.options.id],
      });
      async.waterfall([
        _.bind(query.exec, query),
        this.beforeUpdate(req, res, next),
        this.execSave(req, res, next),
      ], this.sendData(req, res, next));
    }, this);
  },
  remove: function() {
    return _.bind(function(req, res, next) {
      this.getQuery(req).remove({
        _id: req.params[this.options.id]
      }, function(err) {
        if (err) {
          next(err);
        } else {
          res.json({message: 'Successfully deleted'});
        }
      });
    }, this);
  },
});

module.exports = Resource;
