var angular = require('angular');

var communityModule = angular.module('community', ['ngFileUpload'])
  , ctrls = require('./ctrls')
;
communityModule
  .controller('CommunityCtrl', ctrls.CommunityCtrl)
  .controller('CreateCommunityCtrl', ctrls.CreateCommunityCtrl)
  .controller('ViewCtrl', ctrls.ViewCtrl)
  .controller('MemberCtrl', ctrls.MemberCtrl)
  .controller('ProfileMemberCtrl', ctrls.ProfileMemberCtrl)
  .controller('ViewerCtrl', ctrls.ViewerCtrl)
  .controller('ManageCtrl', ctrls.ManageCtrl)
  .controller('UpLoadCtrl', ctrls.UpLoadCtrl)
  .directive('communityHeader', require('./header'))
  .directive('resizer', require('../resizer'))
  .directive('codemirror', require('./codemirror'))
;

module.exports = communityModule;
