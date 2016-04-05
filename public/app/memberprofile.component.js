var AuthService = require('./services/auth')
    , CommunityService = require('./services/community')
    , UIService = require('./ui.service')
    , URI = require('urijs')
    , RESTService = require('./services/rest')
    , config = require('./config')
    , base64url = require('base64url')
    , crypto = require('crypto')
    , Router = ng.router.Router
    , Location = ng.router.Location
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
  joinCommunity: function(community) {
    var self = this;
    if (community.attrs.accept && community.attrs.autoaccept && community.attrs.alldolead) {
      self.communityService.addMember(community, self.authUser, 'LEADER')
        .subscribe(function(){
          self._authService.refresh();
        });
      self.uiService.manageModal$.emit({type:'join-community', community: community, communityleader: "all", status:"alldolead" });
      return;
    }
    //need function to get the leader of this community
    self.communityService.getMemberships(community)
      .subscribe(function(users) {
        var joinstatus;
        for (var i=0; i<users.length; i++) {
          var leadersought=users[i].memberships.filter(function (obj){return (obj.role === "CREATOR" || obj.role === "LEADER");})[0];
          if (leadersought) {
            self.communityleader={email:users[i].local.email, name:users[i].local.name};
            i=users.length;
          }
        }
        if (community.attrs.accept && community.attrs.autoaccept) {
          joinstatus="autoaccept";
          self.communityService.addMember(community, self.authUser, 'MEMBER')
            .subscribe(function(){
              self._authService.refresh();
            });
          self.restService.http.get('/app/joinnotifyauto.ejs')
            .subscribe(function(result) {
              var tpl=_.template(result._body);
              var messagetext=tpl({username: self.authUser.attrs.local.name, useremail: self.authUser.attrs.local.email, communityname: community.attrs.name, communityowner: self.communityleader.name, communityemail:self.communityleader.name})
              self.restService.http.post(
                config.BACKEND_URL + 'sendmail',
                JSON.stringify({
                  from: "noreply@textualcommunities.usask.ca",
                  to: self.communityleader.email,
                  subject: self.authUser.attrs.local.name+' has joined Textual Community "'+community.attrs.name+'"',
                  html: messagetext,
                  text: messagetext.replace(/<[^>]*>/g, '')
                }),
                self.restService.prepareOptions({})
              ).subscribe(function(res) {
                console.log('send mail success');
                self.uiService.manageModal$.emit({type:'join-community', community: community, communityleader: self.communityleader, status:joinstatus});
              });
            }, function(err) {
              console.log(err);
            });
        }
        if (community.attrs.accept && !community.attrs.autoaccept) {
            //who is the leader of this community
            joinstatus="requestaccept";
            self.restService.http.get('/app/joinletter.ejs')
              .subscribe(function(result) {
                var tpl=_.template(result._body);
                var messagetext=tpl({username: self.authUser.attrs.local.name, useremail: self.authUser.attrs.local.email, communityname: community.attrs.name, communityowner: self.communityleader.name, communityemail: self.communityleader.email})
                self.restService.http.post(
                  config.BACKEND_URL + 'sendmail',
                  JSON.stringify({
                    from: self.communityleader.email,
                    to: self.authUser.attrs.local.email,
                    subject: 'Your application to join Textual Community "'+community.attrs.name+'"',
                    html: messagetext,
                    text: messagetext.replace(/<[^>]*>/g, '')
                  }),
                  self.restService.prepareOptions({})
                ).subscribe(function(res) {
                  console.log('send mail success');
                });
              }, function(err) {
                console.log(err);
              });
          self.restService.http.post(
            config.BACKEND_URL + 'actions',
            JSON.stringify({
              type: 'request-membership',
              payload: {
                user: self.authUser.getId(),
                community: community.getId(),
                role: 'MEMBER',
              }
            }),
            self.restService.prepareOptions({})
          ).subscribe(function(res) {
            self.uiService.manageModal$.emit({type:'join-community', community: community, communityleader: self.communityleader, status:joinstatus });
          });
        };
      });
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
