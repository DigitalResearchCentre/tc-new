var CommunityService = require('./services/community')
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
  constructor: [Router, Location, CommunityService, UIService, RESTService, function(router, location, communityService, uiService, restService) {
    var self=this;
    this._router = router;
    this._location = location;
    this.communityService = communityService;
    this.uiService=uiService;
    this.restService=restService;
    this.state = uiService.state;

    this.communityleader = {
      email:"peter.robinson@usask.ca", name:"Peter Robinson"
    };
  }],
  joinCommunity: function(community) {
    return joinCommunity(
      community, this.state.authUser, 
      this.communityService, this.uiService, this.restService
    );
  },
  joinableCommunities: function() {
    var communityService = this.communityService
      , state = this.state
      , authUser = state.authUser
      , publicCommunities = state.publicCommunities
      , memberships = _.get(authUser, 'attrs.memberships', [])
      , nmemberships = memberships.length
    ;
    this.joinableCommunities = _.filter(publicCommunities, function(community) {
      return communityService.canJoin(community, authUser);
    });
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate)
    return date.toDateString()
  },
  loadModal: function(which) {
    this.uiService.manageModal$.emit(which);
  },
  navigate: function(community, route) {
    var instruction = this._router.generate([
      'Community', {id: community.getId(), route: route}
    ]);
    this._location.go(instruction.toRootUrl());
  },
});

module.exports = MemberProfileComponent;
