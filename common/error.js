const _ = require('./mixin');

module.exports = _.inherit(Error, function() {
  const error = Error.apply(this, arguments);
  this.name = error.name;
  this.message = error.message;
  this.stats = error.stats;
  Object.defineProperty(this, 'stack', {
    get: function () {
        return error.stack;
    },
  });
  return this;
}, {}, {
  extend: function(name) {
    const cls = this;
    return _.inherit(cls, function() {
      cls.apply(this, arguments);
      this.name = name;
    });
  }
});
