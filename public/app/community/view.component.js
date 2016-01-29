var CommunityService = require('../community.service')
  , UIService = require('../ui.service')
  , $ = require('jquery')
  , ImageMap = require('./map')
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
    var self = this
      , community = this.community
    ;
    console.log(community);
    var $imageMap = $('.image_map');
    var options = {zoom: 2 , minZoom: 1, maxZoom: 5};
    var imageMap = new ImageMap(
      $imageMap[0], 
      'http://textualcommunities.usask.ca/api/docs/3063121/has_image/', 
      options);
  },
  toggleDoc: function(doc) {
    doc.expand = !doc.expand;
  },
  selectDoc: function(doc) {
    console.log(doc);
  },
  selectPage: function(page) {
    console.log(page);
  },
});

module.exports = ViewComponent;


