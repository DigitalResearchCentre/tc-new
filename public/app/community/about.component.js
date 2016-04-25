var UIService = require('../services/ui');

var CommunityAboutComponent = ng.core.Component({
  selector: 'tc-community-about',
  templateUrl: '/app/community/about.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [UIService, function(uiService) {
    this.state = uiService.state;
  }],
});

module.exports = CommunityAboutComponent;
