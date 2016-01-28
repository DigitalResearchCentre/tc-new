var CommunityService = require('../community.service')
  , UIService = require('../ui.service')
;

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-view',
  templateUrl: '/app/community/view.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [CommunityService, UIService, function(
    communityService, uiService
  ) {
    console.log('community view');
    this._communityService = communityService;
    this._uiService = uiService;
  }],
  ngOnInit: function() {
    var self = this;
    console.log(this.community);
  },
  selectDoc: function(doc) {
    console.log(doc);
  },
  selectPage: function(page) {
    console.log(page);
  },
});

module.exports = CommunityHomeComponent;
