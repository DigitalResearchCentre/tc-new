var _ = require('underscore')
  , util = require('util')
  , $ = require('jquery')
;


var Resource = function() {
  
}

var Community = function() {
  Resource.apply(this, arguments);
}
util.inherits(Community, Resource);
_.extend(Community.prototype, {

});


module.exports = {
  Community: Community,
  User: User,
};

