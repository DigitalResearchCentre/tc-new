var UIService = require('../services/ui')
  , config = require('../config')
  , $ = require('jquery')
;

var CommunityAboutComponent = ng.core.Component({
  selector: 'tc-community-about',
  templateUrl: '/app/community/about.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [UIService, function(uiService) {
    var self=this;
    this.state = uiService.state;
    this.message="Gathering information about this community. This may take a few moments."
    $.get(config.BACKEND_URL+'getCommunityInf/?community='+this.state.community.attrs.abbr, function(res) {
      self.numOfPages=res.numOfPages;
      self.numOfPagesTranscribed=res.numOfPagesTranscribed;
      self.numOfMembers=res.numOfMembers;
      self.assigned=res.assigned;
      self.submitted=res.submitted;
      self.inprogress=res.inprogress;
      self.approved=res.approved;
      self.committed=res.committed;
      self.revisions=res.revisions;
      self.message="";
    });
    if (!this.state.community.attrs.created) {
      if (this.state.community.attrs.abbr=="CTP2") var time=new Date("2012-01-01");
      else if (this.state.community.attrs.abbr=="JDDP") var time=new Date("2013-01-01");
      else var time=new Date("2018-01-01");
    } else var time=new Date(this.state.community.attrs.created);
    var secs=time.getTime();
    self.periods=[];
    $.get(config.BACKEND_URL+'getTranscriptRecord/?community='+this.state.community.attrs.abbr+'&since='+secs, function(res) {
      self.periods=res;
    });
  }],
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return date.getDate()+" "+months[date.getMonth()]+" "+date.getFullYear();
//    return date.toDateString()
  },
});

module.exports = CommunityAboutComponent;
