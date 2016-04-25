var  config = require('./config');


 function joinCommunity (
   community, authUser, communityService, uiService, restService
 ) {
  var communityleader;
  if (community.attrs.accept && community.attrs.autoaccept && community.attrs.alldolead) {
    communityService.addMember(community, authUser, 'LEADER');
    uiService.manageModal$.emit({type:'join-community', community: community, communityleader: "all", status:"alldolead" });
    return;
  }
  //need function to get the leader of this community
  communityService.getMemberships(community)
    .subscribe(function(users) {
      var joinstatus;
      for (var i=0; i<users.length; i++) {
        var leadersought=users[i].memberships.filter(function (obj){return (obj.role === "CREATOR" || obj.role === "LEADER");})[0];
        if (leadersought) {
          communityleader={
            email:users[i].local.email, name:users[i].local.name
          };
          i=users.length;
        }
      }
      if (community.attrs.accept && community.attrs.autoaccept) {
        joinstatus="autoaccept";
        communityService.addMember(community, authUser, 'MEMBER');
        restService.http.get('/app/joinnotifyauto.ejs')
          .subscribe(function(result) {
            var tpl=_.template(result._body);
            var messagetext=tpl({
              username: authUser.attrs.local.name,
              useremail: authUser.attrs.local.email,
              communityname: community.attrs.name,
              communityowner: communityleader.name,
              communityemail: communityleader.name
            });
            restService.http.post(
              config.BACKEND_URL + 'sendmail',
              JSON.stringify({
                from: "noreply@textualcommunities.usask.ca",
                to: communityleader.email,
                subject: authUser.attrs.local.name+' has joined Textual Community "'+community.attrs.name+'"',
                html: messagetext,
                text: messagetext.replace(/<[^>]*>/g, '')
              }),
              restService.prepareOptions({})
            ).subscribe(function(res) {
              console.log('send mail success');
              uiService.manageModal$.emit({type:'join-community', community: community, communityleader: communityleader, status:joinstatus});
            });
          }, function(err) {
            console.log(err);
          });
      }
      if (community.attrs.accept && !community.attrs.autoaccept) {
          //who is the leader of this community
          joinstatus="requestaccept";
          restService.http.get('/app/joinletter.ejs')
            .subscribe(function(result) {
              var tpl=_.template(result._body);
              var messagetext=tpl({username: authUser.attrs.local.name, useremail: authUser.attrs.local.email, communityname: community.attrs.name, communityowner: communityleader.name, communityemail: communityleader.email})
              restService.http.post(
                config.BACKEND_URL + 'sendmail',
                JSON.stringify({
                  from: communityleader.email,
                  to: authUser.attrs.local.email,
                  subject: 'Your application to join Textual Community "'+community.attrs.name+'"',
                  html: messagetext,
                  text: messagetext.replace(/<[^>]*>/g, '')
                }),
                restService.prepareOptions({})
              ).subscribe(function(res) {
                console.log('send mail success');
              });
            }, function(err) {
              console.log(err);
            });
        restService.http.post(
          config.BACKEND_URL + 'actions',
          JSON.stringify({
            type: 'request-membership',
            payload: {
              user: authUser.getId(),
              community: community.getId(),
              role: 'MEMBER',
            }
          }),
          restService.prepareOptions({})
        ).subscribe(function(res) {
          uiService.manageModal$.emit({type:'join-community', community: community, communityleader: communityleader, status:joinstatus });
        });
      };
    });
}

module.exports=joinCommunity;
