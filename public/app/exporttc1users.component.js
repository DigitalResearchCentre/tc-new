var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , Router = ng.router.Router
  , async = require('async')
;

var ExportTC1UsersComponent = ng.core.Component({
  selector: 'tc-managemodal-export-tc1users',
  templateUrl: '/app/exporttc1users.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereader')
  ],
}).Class({
  constructor: [
    Router, CommunityService, UIService, function(
      router, communityService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    this._router = router;
    this.doc = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("400px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.users=[];
    this.cAbbrev="";
    }],
  ngOnInit: function() {
    var self = this;
  },
  filechange: function(filecontent) {
    this.filecontent = filecontent;
  },
  importUsers: function(){
     var users=JSON.parse(this.filecontent);
     var self=this;
     $.ajax({
       url:config.BACKEND_URL+'importTC1Users?community='+self.cAbbrev,
       type: 'POST',
       data: JSON.stringify(users),
       accepts: 'application/json',
       contentType: 'application/json; charset=utf-8',
       dataType: 'json'
     })
     .done(function(data){
       self.success=data.nusers+' users written to community "'+self.cAbbrev+'". Processing finished.';
     })
     .fail(function( jqXHR, textStatus, errorThrown) {
      alert( "error" + errorThrown );
     });
  },
  exportUsers: function() {
    var self=this;
    if (this.cAbbrev=="") {
      this.message="Supply a community abbreviation"
      return;
    }
    $.get("http://textualcommunities.usask.ca/api/communities/?format=json", function (communities, status) {
      var myCommunity=communities.filter(function (obj){return (obj.abbr== self.cAbbrev);})[0];
      if (!myCommunity) {
        self.message="Can't find community "+self.cAbbrev;
        return;
      }
      //get all the memberships... this will give us all the users who belong to our community
      $.get("http://www.textualcommunities.usask.ca/api/memberships/?format=json", function (memberships, status) {
        var myMemberships=memberships.filter(function (obj){return (obj.community== myCommunity.id);});
        if (!myMemberships) {
          self.message="Can't find members of community "+self.cAbbrev;
          return;
        }
        $.get("http://www.textualcommunities.usask.ca/api/users/?format=json", function (users, status){
          //now, go through and get info for each user..
          var myUsers=[]
          for (var i=0; i<myMemberships.length; i++) {
            var myRoles=users.filter(function (obj){return (obj.id== myMemberships[i].user);});
            for (var j=0; j<myRoles.length; j++) {
              myUsers.push({name: myRoles[j].first_name+" "+myRoles[j].last_name, email: myRoles[j].email, role: myMemberships[i].role, created:myMemberships[i].create_date})
            }
          }
          self.success=myUsers.length+" users found for this community";
          download(JSON.stringify(myUsers), "myUsers.json", "application/json")
        })
      });
    });
  },
  closeModalVM: function() {
    this.message=this.success=this.cAbbrev="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});

function download(content, filename, contentType)
{
    if(!contentType) contentType = 'application/octet-stream';
        var a = document.createElement('a');
        var blob = new Blob([content], {'type':contentType});
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();
}

module.exports = ExportTC1UsersComponent;
