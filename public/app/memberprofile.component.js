var AuthService = require('./auth.service')
    , CommunityService = require('./services/community')
    , UIService = require('./ui.service')

var MemberProfileComponent = ng.core.Component({
  selector: 'tc-member-profile',
  templateUrl: '/app/memberprofile.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
  ],
}).Class({
  constructor: [AuthService, CommunityService, UIService, function(authService, communityService, uiService) {
    var self=this;
    this.communityService = communityService;
    this.uiService=uiService;
    this.authUser = authService._authUser;
    this.nmemberships= authService._authUser.attrs.memberships.length;
    this.memberships= authService._authUser.attrs.memberships;
    this.communityService.allCommunities$.subscribe(function(communities) {
      self.allCommunities = communities;
    });

  }],
  formatDate: function(rawdate) {
    var date = new Date(rawdate)
    return date.toDateString()
  },
  loadModal: function(which) {
    this.uiService.manageModal$.emit(which);
  },
  joinCommunity: function(community) {
    this.uiService.manageModal$.emit({type:'join-community', community: community});
  },
  showCommunity: function(community) {
    if (this.nmemberships) {
      var matchedmem=this.memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id;})[0];
      if (matchedmem) return false;
    }
    if (!community.attrs.public) return false;
    if (!community.attrs.accept) return false;
    return true;
  }
});

module.exports = MemberProfileComponent;
