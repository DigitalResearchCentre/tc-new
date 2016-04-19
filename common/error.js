const _ = require('./mixin');

module.exports = _.inherit(Error, function() {
  const error = Error.apply(this, arguments);
  error.name = this.name || 'Error';
  this.message = error.message;
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
      this.name = name;
      cls.apply(this, arguments);
    });
  }
});
