var $ = require('jquery')
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , Router = ng.router.Router
  , async = require('async')
;

var ViewAllCommunitiesComponent = ng.core.Component({
  selector: 'tc-managemodal-view-allcommunities',
  templateUrl: '/app/viewallcommunities.html',
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [
    Router, CommunityService, UIService, function(
      router, communityService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    this._router = router;
    this.doc = {name:""};
    $('#manageModal').width("1000px");
    $('#manageModal').height("800px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.communities=[];
    }],
  ngOnInit: function() {
    this.populateCommunities(this);
  },
  navigate: function(community, route) {
    var instruction = this._router.generate([
      'Community', {id: community, route: route}
    ]);
    window.location=instruction.toRootUrl();
  },
  closeModalVM: function() {
    $('#manageModal').modal('hide');
  },
  toggleInstance: function(instance) {
    instance.expand = !instance.expand;
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return date.getDate()+" "+months[date.getMonth()]+" "+date.getFullYear();
//    return date.toDateString()
  },
  deleteCommunity: function(community) {
    var self=this;
    $.post(config.BACKEND_URL+'deleteAllDocs?id='+community+'&deleteComm=true', function(res) {
      alert("Community Deleted");
      self.populateCommunities(self);
    });
  },
  navigate: function(community, route) {
    var instruction = this._router.generate([
      'Community', {id: community, route: route}
    ]);
    window.location=instruction.toRootUrl();
  },
  deleteAllCommunities: function() {
    var self=this;
    async.map(this.communities, function(community, callback){
        $.post(config.BACKEND_URL+'deleteAllDocs?id='+community._id+'&deleteComm=true', function(res) {
          if (res.error) callback(res.error);
          else callback(null);
        });
    }, function(err){
      if (err) alert(err);
      else alert("All communities eliminated. I hope you are happy now");
      self.populateCommunities(self);
    })
  },
  populateCommunities: function(self) {
    $.post(config.BACKEND_URL+'SUgetAllCommunities', function(res) {
      //find creator for each community..
      for (var i=0; i<res.length; i++) {
        var creator=res[i].members.filter(function(obj){return obj.role == "CREATOR";})[0];
        if (creator) res[i].creator=creator.user;
        else res[i].creator="NONE"
      }
      res.sort(function(a,b){
        return new Date(a.created) - new Date(b.created);
      });
      self.communities=res;
    });

  }
});

module.exports = ViewAllCommunitiesComponent;
