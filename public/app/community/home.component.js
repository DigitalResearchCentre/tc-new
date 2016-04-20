var RouteParams = ng.router.RouteParams
  , CommunityService = require('../services/community')
  , AuthService = require('../services/auth')
  , UIService = require('../services/ui')
  , RESTService = require('../services/rest')
  , joinCommunity = require('../joinCommunity')
;

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-home',
  templateUrl: '/app/community/home.html',
}).Class({
  constructor: [RouteParams, CommunityService, UIService, AuthService, RESTService, function(
    routeParams, communityService, uiService, authService, restService
  ) {
    console.log('community home');
    this._routeParams = routeParams;
    this.communityService = communityService;
    this.uiService = uiService;
    this.community = uiService.community;
    this.restService=restService;
    this.authUser = authService._authUser;
    //if not logged in... nil
    if (authService._authUser && authService._authUser.attrs.memberships.length>0)
      this.memberships= authService._authUser.attrs.memberships;
    else   this.memberships=null;
    this.joinCommunity = joinCommunity;
  }],
  ngOnInit: function() {
    var self = this;
    window.cc = this.community;
  },
  isCreator: function() {
    if (!this.memberships) return false;
    var memberships=this.memberships;
    var community=this.community;
    var creatorfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && obj.role === "CREATOR";})[0];
    if (creatorfound) return true;
    else return false;
  },
 isLeader: function() {
    if (!this.memberships) return false;
    var memberships=this.memberships;
    var community=this.community;
    var leaderfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && obj.role === "LEADER";})[0];
    if (leaderfound) return true;
    else return false;
  },
  isMember: function(){
    if (!this.memberships) return false;
    var memberships=this.memberships;
    var community=this.community;
    var memberfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && obj.role === "MEMBER";})[0];
    if (memberfound) return true;
    else return false;
  },
  logInIdiot: function() {
    this.uiService.manageModal$.emit({type:'message-login', community: this.community});
  },
  canJoin: function() {
     if (this.isLeader() || this.isCreator() || this.isMember() || !this.authUser) return false;
     if (this.community.attrs.accept) return true;
     else return false;
   },
});



module.exports = CommunityHomeComponent;
