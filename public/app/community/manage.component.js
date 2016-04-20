var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , AuthService = require('../services/auth')
;

var ManageCommunityComponent = ng.core.Component({
  selector: 'tc-manage-community',
  templateUrl: '/app/community/manage.html',
  inputs: [ 'community',],
  directives: [
  ],
}).Class({
  constructor: [UIService, AuthService,  function(uiService, authService) {
    this._uiService = uiService;
    this._authService = authService;
    if (authService._authUser && authService._authUser.attrs.memberships.length>0)
      this.memberships= authService._authUser.attrs.memberships;
    else  this.memberships=null;

  }],
  loadModal: function(which) {
    this._uiService.manageModal$.emit(which);
  },
  isLeader: function() {
     if (!this.memberships) return false;
     var memberships=this.memberships;
     var community=this.community;
     var leaderfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && obj.role === "LEADER";})[0];
     if (leaderfound) return true;
     else return false;
   },
   isCreator: function(){
     if (!this.memberships) return false;
     var memberships=this.memberships;
     var community=this.community;
     var memberfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && obj.role === "CREATOR";})[0];
     if (memberfound) return true;
     else return false;
   },
});

module.exports = ManageCommunityComponent;
