var angular = require('angular');

var communityModule = angular.module('community', ['ngFileUpload'])
  , ctrls = require('./ctrls')
  , manageCtrls = require('./manage/ctrls')
;
communityModule
  .controller('CommunityCtrl', ctrls.CommunityCtrl)
  .controller('CreateCommunityCtrl', ctrls.CreateCommunityCtrl)
  .controller('ViewCtrl', ctrls.ViewCtrl)
  .controller('MemberCtrl', ctrls.MemberCtrl)
  .controller('ProfileMemberCtrl', ctrls.ProfileMemberCtrl)
  .controller('ViewerCtrl', ctrls.ViewerCtrl)
  .controller('ManageCtrl', manageCtrls.ManageCtrl)
  .controller('AddXMLDocCtrl', manageCtrls.AddXMLDocCtrl)
  .controller('UpLoadCtrl', ctrls.UpLoadCtrl)
  .directive('communityHeader', require('./header'))
  .directive('resizer', require('../resizer'))
  .directive('readMore', require('../readmore'))
  .directive('codemirror', require('./codemirror'))
  .directive('filereader', require('../directives/filereader'))
;

module.exports = communityModule;
