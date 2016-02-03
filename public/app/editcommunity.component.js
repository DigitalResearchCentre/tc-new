var CommunityService = require('./community.service');

var EditCommunityComponent = ng.core.Component({
  selector: 'tc-edit-community',
  templateUrl: '/app/editcommunity.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
    this._communityService = communityService;
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
    var self = this;
    this._communityService.save(this.edit).subscribe(function(community) {
      console.log(community);
      self.initEdit(community);
    }, function(err) {
      self.message = err.message;
    });
  },
});

module.exports = EditCommunityComponent;
