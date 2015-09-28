var _ = require('lodash');

_.mixin({
  inherit: function(base, child, props) {
    child.prototype = _.create(base.prototype, _.assign({
      _super: base.prototype,
      'constructor': child,
    }, props));

    return child;
  },
});

module.exports = _;
