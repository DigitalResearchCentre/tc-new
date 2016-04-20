var AuthService = require('./services/auth')
    , CommunityService = require('./services/community')
    , UIService = require('./services/ui')
    , URI = require('urijs')
    , RESTService = require('./services/rest')
    , config = require('./config')
    , base64url = require('base64url')
    , crypto = require('crypto')
    , Router = ng.router.Router
    , Location = ng.router.Location
    , joinCommunity = require('./joinCommunity')
;
    /* function example(communityService, community, user) {
      communityService.addMember(community, user, 'MEMBER')
        .subscribe(function(updatedUser){
          console.log(updatedUser);
        });
    } */


function randomStringAsBase64Url(size) {
      return base64url(crypto.randomBytes(size));
    }

var MemberProfileComponent = ng.core.Component({
  selector: 'tc-member-profile',
  templateUrl: '/app/memberprofile.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
  ],
}).Class({
  constructor: [AuthService, Router, Location, CommunityService, UIService, RESTService, function(authService, router, location, communityService, uiService, restService) {
    var self=this;
    this._authService = authService;
    this._router = router;
    this._location = location;
    this.communityService = communityService;
    this.uiService=uiService;
    this.restService=restService;
    this.authUser = authService._authUser;
    this.nmemberships= authService._authUser.attrs.memberships.length;
    this.memberships= authService._authUser.attrs.memberships;
    this.joinCommunity = joinCommunity;

    authService.authUser$.subscribe(this.onMemberhipUpdate.bind(this))
    this.communityleader = {
      email:"peter.robinson@usask.ca", name:"Peter Robinson"
    };
    this.onMemberhipUpdate();
  }],
  onMemberhipUpdate: function() {
    var self = this;
    this.memberships = this.authUser.attrs.memberships;
    this.nmemberships = this.memberships.length;
    this.communityService.allCommunities$.subscribe(function(communities) {
      self.joinableCommunities = _.filter(
        communities, self.showCommunity.bind(self)
      );
    });
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate)
    return date.toDateString()
  },
  loadModal: function(which) {
    this.uiService.manageModal$.emit(which);
  },
  isLeader: function (community) {
    var memberships=this.memberships;
    var leaderfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && (obj.role === "CREATOR" || obj.role === "LEADER");})[0];
    if (leaderfound) return true;
    else return false;
  },
  navigate: function(community, route) {
    var instruction = this._router.generate([
      'Community', {id: community.getId(), route: route}
    ]);
    this._location.go(instruction.toRootUrl());
  },
  showCommunity: function(community) {
    if (this.nmemberships) {
      var matchedmem=this.memberships.filter(function (obj){
        return obj.community.attrs._id === community.attrs._id;
      })[0];
      if (matchedmem) return false;
    }
    if (!community.attrs.public) return false;
    if (!community.attrs.accept) return false;
    return true;
  }
});

module.exports = MemberProfileComponent;
