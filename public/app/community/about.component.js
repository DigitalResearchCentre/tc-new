var CommunityService = require('../services/community');

var CommunityAboutComponent = ng.core.Component({
  selector: 'tc-community-about',
  templateUrl: '/app/community/about.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
    this._communityService = communityService;
  }],
  ngOnInit: function() {
    console.log(this.community);
    //this._communityService.fetchCommunityStatus(this.community);
  }
});

module.exports = CommunityAboutComponent;
