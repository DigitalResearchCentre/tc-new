var angular = require('angular');

var communityModule = angular.module('community', [])
  , ctrls = require('./ctrls')
;
communityModule
  .controller('CommunityCtrl', ctrls.CommunityCtrl)
  .controller('CreateCommunityCtrl', ctrls.CreateCommunityCtrl)
  .controller('ViewCtrl', ctrls.ViewCtrl)
  .controller('ViewerCtrl', ctrls.ViewerCtrl)
  .directive('communityHeader', require('./header'))
  .directive('resizer', require('../resizer'))
;

module.exports = communityModule;
