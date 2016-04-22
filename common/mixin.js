var _ = require('lodash');

_.mixin({
  inherit: function(base, child, props, statics) {
    if (!_.isFunction(child)) {
      statics = props;
      props = child;
      child = function() {
        var self = base.apply(this, arguments);
        if (!_.isUndefined(self)) return self;
      };
    }
    child.prototype = _.create(base.prototype, _.assign({
      _super: base.prototype,
      'constructor': child,
    }, props));

    child.statics = _.assign({}, statics);
    _.assign(child, base.statics, child.statics);

    return child;
  },
  /*
   * @param queue - [treeNode]
   * @return queue - queue of unchecked nodes
   * dfs may exit iteration early by explicitly returning false
   */
  dfs: function (_queue, fn, getChildren) {
    const queue = []
      , push =  _.unary(_.bind(queue.push, queue))
    ;
    let loop = true
      , cur
    ;
    if (!getChildren) {
      getChildren = function(node) {
        return node ? node.children : [];
      }
    }
    _.forEachRight(_queue, push);
    while(queue.length > 0 && loop !== false) {
      cur = queue.pop();
      loop = fn(cur);
      _.forEachRight(getChildren(cur), push);
    }
    return _.reverse(queue);
  },
});

module.exports = _;

