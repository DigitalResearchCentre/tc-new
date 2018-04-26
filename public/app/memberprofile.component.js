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
  , sortBy = require('sort-array')
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
    , authUser = this.state.authUser, self=this;
    this.nmemberships=authUser.attrs.memberships.length;
    this.memberships=authUser.attrs.memberships;
    for (var i=0; i<this.memberships.length; i++) {
      this.memberships[i].pageinstances={assigned:[], inprogress:[], submitted:[], approved:[], committed:[]}
    }
    this.communityleader = {
      email:"peter.robinson@usask.ca", name:"Peter Robinson"
    };
    //get list of all pages assigned to this user, for every membership (is this the best way to do this..?
    //use this to create
    async.map(authUser.attrs.memberships, getMemberTasks, function (err, results){
      for (var i=0; i<self.memberships.length;i++) {
        for (var j=0; j<results.length; j++) {
          if (String(self.memberships[i]._id)==results[j].memberId) {
        //    adjustNumbers((results[j].assigned));
      //      var bill=sortBy(results[j].assigned, ['docName', 'sortable']);
            if (results[j].assigned.length) {adjustNumbers((results[j].assigned)); sortBy(results[j].assigned, ['docName', 'sortable']);}
            if (results[j].approved.length) {adjustNumbers((results[j].approved)); sortBy(results[j].approved, ['docName', 'sortable']);}
            if (results[j].inprogress.length) {adjustNumbers((results[j].inprogress)); sortBy(results[j].inprogress, ['docName', 'sortable']);}
            if (results[j].submitted.length) {adjustNumbers((results[j].submitted)); sortBy(results[j].submitted, ['docName', 'sortable']);}
            if (results[j].committed.length) {adjustNumbers((results[j].committed)); sortBy(results[j].committed, ['docName', 'sortable']);}
            self.memberships[i].pageinstances=results[j];
          }
        }
      }
    })
    this.joinableCommunities = _.filter(publicCommunities, function(community) {
      return communityService.canJoin(community, authUser);
    });
  },
  getHistory: function(user, community) {
    this.uiService.manageModal$.emit ({type:'transcriber-history', userid: user._id, username: user.attrs.local.name, community: community});
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
  invite: function(community) { //let's invite someone!
    this.uiService.manageModal$.emit({
      type: 'invite-member',
      community:   community,
      inviter: this.authUser
    });
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
  showPage: function(community, document, page) {
    var instruction = this._router.generate([
      'Community', {id: community.getId(), route: 'view', document:document, page:page}
    ]);
    window.location=instruction.toRootUrl();
  }
});

function getMemberTasks (member, callback) {
  $.post(config.BACKEND_URL+'getMemberTasks?'+'id='+member._id, function(res) {
      callback(null, res);
    });
}

function adjustNumbers(sourceArray) {
  for (var i=0; i<sourceArray.length; i++) {
    var nlen=0;
    if (!isNaN(sourceArray[i].name[0])) {
      var nlen=0, newName=sourceArray[i].name;
      while (!isNaN(sourceArray[i].name[nlen])) nlen++;
      nlen=6-nlen;
      while (nlen> 0 ) {newName = "0" + newName; nlen--}
      sourceArray[i].sortable=newName;
    } else sourceArray[i].sortable=sourceArray[i].name;
  }
}

module.exports = MemberProfileComponent;
