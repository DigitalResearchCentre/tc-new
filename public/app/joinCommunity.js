var  config = require('./config');


 function joinCommunity (community) {
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
}

module.exports=joinCommunity;
