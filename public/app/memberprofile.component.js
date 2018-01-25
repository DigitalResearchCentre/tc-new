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
  , async = require('async')
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
    this.authUser = this.state.authUser;
  }],
  ngOnInit: function() {
    var publicCommunities = state.publicCommunities
    , communityService = this.communityService
    , authUser = this.state.authUser;
    this.nmemberships=authUser.attrs.memberships.length;
    this.memberships=authUser.attrs.memberships;
    this.communityleader = {
      email:"peter.robinson@usask.ca", name:"Peter Robinson"
    };
    //get list of all pages assigned to this user, for every membership (is this the best way to do this..?
    //use this to create
    async.map(authUser.attrs.memberships, getMemberTasks, function (err, results){
      var bill=0;
    })
    this.joinableCommunities = _.filter(publicCommunities, function(community) {
      return communityService.canJoin(community, authUser);
    });
  },
  joinCommunity: function(community) {
    return joinCommunity(
      community, this.state.authUser,
      this.communityService, this.uiService, this.restService
    );
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
    window.location=instruction.toRootUrl();
  },
});

function getMemberTasks (member, callback) {
  $.post(config.BACKEND_URL+'getMemberTasks?'+'id='+member._id, function(res) {
      var bill=res;
      callback(null, res);
    });
}

module.exports = MemberProfileComponent;
