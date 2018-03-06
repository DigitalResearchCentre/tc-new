var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , Router = ng.router.Router
  , async = require('async')
;

var ViewAllUsersComponent = ng.core.Component({
  selector: 'tc-managemodal-view-allusers',
  templateUrl: '/app/viewallusers.html',
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
    this.users=[];
    }],
  ngOnInit: function() {
    var self = this;
    this.populateUsers(self);
  },
  populateUsers: function(self){
    $.post(config.BACKEND_URL+'SUgetAllUsers', function(res) {
      res.sort(function(a,b){
        return new Date(a.created) - new Date(b.created);
      });
      self.users=res;
    });
  },
  formatDate:function (rawdate) {
    var date = new Date(rawdate)
    return date.toDateString()
  },
  navigate: function(community, route) {
    var instruction = this._router.generate([
      'Community', {id: community, route: route}
    ]);
    window.location=instruction.toRootUrl();
  },
  deleteAllUsers: function(){
    var self=this;
    async.map(this.users, function(user, callback){
      $.post(config.BACKEND_URL+'deleteUser?id='+user._id, function(res) {
        if (res.error) callback(res.error);
        else callback(null);
      });
    }, function (err) {
      alert("All users deleted "+err);
      self.populateUsers(self);
    });
  },
  deleteUser: function(user){
    var self=this;
    $.post(config.BACKEND_URL+'deleteUser?id='+user, function(res) {
       alert(res.result);
       self.populateUsers(self);
    });
  },
  closeModalVM: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});


module.exports = ViewAllUsersComponent;
