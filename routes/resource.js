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
      .delete(options.auth.delete, this.remove())
    ;
  },
  isAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
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
  detail: function(opts) {
    var options = _.assign({}, this.options, opts);
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

module.exports = Resource;
