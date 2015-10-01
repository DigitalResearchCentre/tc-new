var angular = require('angular');

var communityModule = angular.module('community', [])
  , ctrls = require('./ctrls')
;
communityModule
  .controller('CommunityCtrl', ctrls.CommunityCtrl)
  .controller('CreateCommunityCtrl', ctrls.CreateCommunityCtrl)
  .controller('ViewCtrl', ctrls.ViewCtrl)
  .controller('ViewerCtrl', ctrls.ViewerCtrl)
  .controller('ManageCtrl', ctrls.ManageCtrl)
  .directive('communityHeader', require('./header'))
  .directive('resizer', require('../resizer'))
  .directive('codemirror', require('./codemirror'))
;

module.exports = communityModule;
