var AuthService = require('./auth.service')
    , CommunityService = require('./services/community')

var MemberProfileComponent = ng.core.Component({
  selector: 'tc-member-profile',
  templateUrl: '/app/memberprofile.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
  ],
}).Class({
  constructor: [AuthService, CommunityService, function(authService, communityService) {
    var self=this;
    this.communityService = communityService;
    this.authUser = authService._authUser;
    this.nmemberships= authService._authUser.attrs.memberships.length;
    this.memberships= authService._authUser.attrs.memberships;
    this.communityService.allCommunities$.subscribe(function(communities) {
      self.allCommunities = communities;
    });

  }],
});

module.exports = MemberProfileComponent;
