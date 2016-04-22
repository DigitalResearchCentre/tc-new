var _ = require('lodash')
  , async = require('async')
;

function _parseJSON(data, defaultResult) {
  try {
    return JSON.parse(data);
  } catch (e) {
    return (defaultResult === void 0) ? null : defaultResult;
  }
}

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
    if (name !== '') {
      name = '/' + name;
    }

    router.route(name)
      .get(this.list())
      .post(options.auth.create, this.create())
    ;

    router.route(name + '/:' + options.id)
      .get(this.detail())
      .put(options.auth.update, this.update())
      .patch(options.auth.update, this.patch())
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
      , find = _parseJSON(urlQuery.find)
      , select = _parseJSON(urlQuery.select)
      , sort = _parseJSON(urlQuery.sort)
      , populate = _parseJSON(urlQuery.populate)
      , model = this.model
      , query
      , optFields
    ;
    query = model.find(find);
    if (select) {
      query = query.select(select);
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (populate) {
      if (!_.isArray(populate)) {
        populate = [populate];
      }
      _.each(populate, function(field) {
        query = query.populate(field);
      });
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
      obj.save(function(err, obj, numberAffected) {
        cb(err, obj);
      });
    };
  },
  afterCreate: function(req, res, next) {
    return function(obj) {
      const cb = _.last(arguments);
      cb(null, obj);
    };
  },
  afterUpdate: function(req, res, next) {
    return function(obj, cb) {
      cb(null, obj);
    };
  },
  sendData: function(req, res, next) {
    var fields = _parseJSON(req.query.fields, [])
      , optFields
    ;
    if (!_.isArray(fields)) {
      fields = [fields];
    }
    function _sendData(err, data) {
      if (err) {
        return next(err);
      } else {
        res.json(data);
      }
    }
    fields = _.intersection(fields, this.model.optionalFields);
    return function(err, data) {
      if (fields.length > 0) {
        var isArray = _.isArray(data);
        async.map(isArray ? data : [data], function(doc, callback) {
          var obj = doc.toObject();
          async.each(fields, function(field, cb) {
            doc['get' + field].call(doc, function(err, value) {
              obj[field] = value;
              cb(err);
            });
          }, function(err) {
            callback(err, obj);
          });
        }, function(err, objs) {
          return _sendData(err, isArray ? objs : objs[0]);
        });
      } else {
        _sendData(err, data);
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
        this.afterCreate(req, res, next),
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
        this.afterUpdate(req, res, next),
      ], this.sendData(req, res, next));
    }, this);
  },
  patch: function() {
    return this.update.apply(this, arguments);
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
