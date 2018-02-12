var UIService = require('../services/ui')
, config = require('../config')
, async = require('async')
, $ = require('jquery')
, Router = ng.router.Router
, sortBy = require('sort-array')
;

var CommunityMembersComponent = ng.core.Component({
  selector: 'tc-community-members',
  templateUrl: '/app/community/members.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [Router, UIService, function(router, uiService) {
    this.state = uiService.state;
    this._router = router;
    this.uiService=uiService;
  }],
  ngOnInit: function() {
    var self=this;
    $.post(config.BACKEND_URL+'community/'+this.community._id+'/members/', function(res) {
      self.members=[];
      for (var i=0; i<res.length; i++) {
          var thisMembership=res[i].memberships.filter(function (obj){return String(obj.community) == String(self.community._id);})[0];
          self.members.push({name:res[i].local.name, email: res[i].local.email, date:thisMembership.created, role:thisMembership.role, approvername: thisMembership.approvername, approvermail: thisMembership.approvermail, assigned:thisMembership.pages.assigned, inprogress:thisMembership.pages.inprogress, submitted:thisMembership.pages.submitted, approved:thisMembership.pages.approved, committed:thisMembership.pages.committed, _id:thisMembership._id, user:res[i], pageinstances: {assigned:[], inprogress:[], committed:[], submitted:[],approved:[], committed:[]}})
      }
      //now, get the tasks for each member..
      async.map(self.members, function(member, callback) {
        $.post(config.BACKEND_URL+'getMemberTasks?'+'id='+member._id, function(result) {
          if (result.assigned.length) {adjustNumbers((result.assigned)); sortBy(result.assigned, ['docName', 'sortable']);}
          if (result.approved.length) {adjustNumbers((result.approved)); sortBy(result.approved, ['docName', 'sortable']);}
          if (result.inprogress.length) {adjustNumbers((result.inprogress)); sortBy(result.inprogress, ['docName', 'sortable']);}
          if (result.submitted.length) {adjustNumbers((result.submitted)); sortBy(result.submitted, ['docName', 'sortable']);}
          if (result.committed.length) {adjustNumbers((result.committed)); sortBy(result.committed, ['docName', 'sortable']);}
          member.pageinstances=result;
          callback(null, res);
        });
      })
    });
  },
  assignApprover: function(member, user) {
    this.uiService.manageModal$.emit({type:'assign-approver', member: member, user: user, community:this.community.attrs.name});
  },
  assignPages: function(memberId, user) {
    this.uiService.manageModal$.emit ({type:'assign-pages', user: user, source: this, community: this.community, memberId:memberId});
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return date.getDate()+" "+months[date.getMonth()]+" "+date.getFullYear();
//    return date.toDateString()
  },
  showPage: function(community, document, page) {
    var instruction = this._router.generate([
      'Community', {id: community.getId(), route: 'view', document:document, page:page}
    ]);
    window.location=instruction.toRootUrl();
  },
  changeRole: function(member, user, role) {
    this.uiService.manageModal$.emit({type:'change-role', member: member, user: user, role: role, community:this.community.attrs.name});
  },
  invite: function(community) { //let's invite someone!
    this.uiService.manageModal$.emit({
      type: 'invite-member',
      community:   community,
      inviter: this.state.authUser
    });
  },
  toggleInstance: function(instance) {
    instance.expand = !instance.expand;
  }
});

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

module.exports = CommunityMembersComponent;
