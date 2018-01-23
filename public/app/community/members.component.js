var UIService = require('../services/ui')
, config = require('../config')
, $ = require('jquery')
;

var CommunityMembersComponent = ng.core.Component({
  selector: 'tc-community-members',
  templateUrl: '/app/community/members.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [UIService, function(uiService) {
    this.state = uiService.state;
    this.uiService=uiService;
  }],
  ngOnInit: function() {
    var self=this;
    $.post(config.BACKEND_URL+'community/'+this.community._id+'/members/', function(res) {
      self.members=[];
      for (var i=0; i<res.length; i++) {
        var thisMembership=res[i].memberships.filter(function (obj){return String(obj.community) == String(self.community._id);})[0];
        self.members.push({name:res[i].local.name, email: res[i].local.email, date:thisMembership.created, role:thisMembership.role, assigned:thisMembership.pages.assigned, inprogress:thisMembership.pages.inprogress, submitted:thisMembership.pages.submitted, committed:thisMembership.pages.committed, _id:thisMembership._id, user:res[i]})
      }
    });
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
});

module.exports = CommunityMembersComponent;
