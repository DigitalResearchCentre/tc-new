var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
/*  , TCMailer=require('./TCMailer')
  , TCAddresses=require('./TCMailer').addresses; */

;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ViewMembersComponent = ng.core.Component({
  selector: 'tc-managemodal-view-members',
  templateUrl: '/app/viewmembers.html',
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    var self=this;
    this.doc = {name:""};
    $('#manageModal').width("800px");
    $('#manageModal').height("500px");
    this.message="";
    this.success="";
    this.community = uiService.community;
    this.communityService=communityService;
    this.uiService = uiService;
    this.communityService.getMemberships(this.community)
      .subscribe(function(members) {
        self.members=members;
        self.nmembers=members.length;
        self.members.forEach (function(member){
          var thismembership=member.memberships.filter(function(obj){return (obj.community === self.community.attrs._id)})[0];
          member.role=thismembership.role;
          member.created=formatDate(thismembership.created);
        })
      });
    }],
  ngOnInit: function() {
      var self = this;
  },
  closeModalVM: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});

function formatDate (rawdate) {
  var date = new Date(rawdate)
  return date.toDateString()
};

module.exports = ViewMembersComponent;
