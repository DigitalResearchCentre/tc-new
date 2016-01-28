var CommunityService = require('../community.service')
  , UIService = require('../ui.service')
;

var ViewComponent = ng.core.Component({
  selector: 'tc-community-view',
  templateUrl: '/app/community/view.html',
  styleUrls: ['/app/community/view.css'],
  inputs: [
    'community',
  ],
  directives: [
    require('../tabs.directive').TAB_DIRECTIVES,
  ]
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

module.exports = ViewComponent;
