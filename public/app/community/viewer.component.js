var CommunityService = require('../community.service')
  , UIService = require('../ui.service')
  , $ = require('jquery')
  , ImageMap = require('./map')
;

var ViewerComponent = ng.core.Component({
  selector: 'tc-viewer',
  templateUrl: '/app/community/viewer.html',
  inputs: [
    'community',
  ],
  directives: [
  ]
}).Class({
  constructor: [CommunityService, UIService, function(
    communityService, uiService
  ) {
    this._communityService = communityService;
    this._uiService = uiService;
    
    this.revisions = [];
    this.page = {};
  }],
  ngOnInit: function() {
    var self = this
      , community = this.community
    ;
    var $imageMap = $('.image_map');
    var options = {zoom: 2 , minZoom: 1, maxZoom: 5};
    var imageMap = new ImageMap(
      $imageMap[0], 
      'http://textualcommunities.usask.ca/api/docs/3063121/has_image/', 
      options);
  },
});

module.exports = ViewerComponent;


