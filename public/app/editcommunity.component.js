var CommunityService = require('./services/community')
  , UIService = require('./ui.service')
;

var EditCommunityComponent = ng.core.Component({
  selector: 'tc-edit-community',
  templateUrl: '/app/editcommunity.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService) {
    var self=this;
    this._communityService = communityService;
    this._uiService = uiService;
    this._communityService.allCommunities$.subscribe(function(communities) {
      self._allCommunities = communities;
    });
  }],
  ngOnInit: function() {
    this.initEdit(this.community);
    this.message = '';
  },
  initEdit: function(community) {
    if (community) {
      this.edit = _.clone(community.toJSON());
      this.community = community;
    } else {
      this.edit = {
        public: false,
        name: "",
        abbr: "",
        longName: "",
        description: "",
        accept: false,
        autoaccept: false,
        alldolead: false,
        haspicture: false,
        image: false,
      };
    }
  },
  submit: function() {
    //is there a community with this name?
    var self=this;
    if (self._allCommunities.length>0) {
      var matchedcom=self._allCommunities.filter(function (obj){return obj.attrs.abbr === self.edit.abbr;})[0];
      if (matchedcom) {
        self.message='There is already a community with the abbreviation "'+self.edit.abbr+'"';
        return;
      }
      var matchedname=self._allCommunities.filter(function (obj){return obj.attrs.name === self.edit.name;})[0];
      if (matchedname) {
        self.message='There is already a community with the name "'+self.edit.name+'"';
        return;
      }
    }
    this.message=this.success="";
    this._communityService.save(this.edit).subscribe(function(community) {
      self.success='Community "'+self.edit.name+'" saved'
      self.initEdit(community);
      self._uiService.setCommunity(community);
    }, function(err) {
      self.message = err.message;
    });
  },
});

module.exports = EditCommunityComponent;
