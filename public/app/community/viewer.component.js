var CommunityService = require('../services/community')
  , UIService = require('../ui.service')
  , DocService = require('../services/doc')
  , $ = require('jquery')
  , ImageMap = require('./map')
;

var ViewerComponent = ng.core.Component({
  selector: 'tc-viewer',
  templateUrl: '/app/community/viewer.html',
  inputs: [
    'community', 'page',
  ],
  directives: [
    require('../directives/codemirror'),
    require('../directives/splitter').SPLITTER_DIRECTIVES,
  ]
}).Class({
  constructor: [CommunityService, UIService, function(
    communityService, uiService
  ) {
    this._communityService = communityService;
    this._uiService = uiService;
    
    this.revisions = [];
    this.page = {};
    this.content = 'hello world';
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


