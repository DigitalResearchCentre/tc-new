var express = require('express')
  , _ = require('lodash')
  , router = express.Router()
  , models = require('../models')
  , Community = models.Community
;

var Resource = function(router, name, opts) {
  this.router = router;
  this.options = _.assign({
    id: 'id',
    list: this.list,
    create: this.create,
    detail: this.detail,
    update: this.update,
    remove: this.remove,
  }, opts);
  this.resource(name);
};
_.assign(Resource.prototype, {
  resource: function(name) {
    var options = this.options;
    this.model = options.model;

    this.router.route('/' + name)
      .get(_.bind(options.list, this))
      .post(_.bind(options.create, this))
    ;

    this.router.route('/' + name + '/:' + options.id)
      .get(_.bind(options.detail, this))
      .put(_.bind(options.update, this))
      .delete(_.bind(options.remove, this))
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
  list: function(req, res) {
    var query = this.getQuery(req);
    query.exec(function(err, objs) {
      if (err) {
        res.send(err)
      } else {
        res.json(objs);
      }
    });
  },
  create: function(req, res) {
    var obj = new this.model(req.body);
    obj.save(function(err) {
      if (err) {
        res.send(err);
      } else {
        res.json(obj);
      }
    });
  },
  detail: function(req, res) {
    var query = this.getQuery(req).findOne({_id: req.params[this.options.id]});
    query.exec(function(err, obj) {
      if (err) {
        res.send(err)
      } else {
        res.json(obj);
      }
    });
  },
  update: function() {
    
  },
  remove: function() {
    
  },
});


new Resource(router, 'communities', {model: Community, id: 'community'});

module.exports = router;
