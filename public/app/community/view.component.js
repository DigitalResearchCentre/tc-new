var CommunityService = require('../services/community')
  , UIService = require('../ui.service')
  , DocService = require('../services/doc')
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
    require('../directives/splitter').SPLITTER_DIRECTIVES,
    require('./viewer.component'),
  ]
}).Class({
  constructor: [CommunityService, UIService, DocService, function(
    communityService, uiService, docService
  ) {
    console.log('community view');
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
  }],
  ngOnInit: function() {
    var self = this
      , community = this.community
    ;
    console.log(community);
  },
  toggleDoc: function(doc) {
    doc.expand = !doc.expand;
    this._docService.fetch(doc.getId(), {
      populate: JSON.stringify('children')
    }).subscribe();
    this.selectDoc(doc);
    console.log(doc);
  },
  selectDoc: function(doc) {
    this._uiService.setDocument(doc);
  },
  selectPage: function(page) {
    this.page = page;
    this._uiService.selectPage(page);
  },
  addPageAfter: function(page) {
    this._uiService.manageModal$.emit('add-document-page');
  },
  toggleEntity: function() {

  },
  selectEntity: function() {

  },
  extractXML: function($event, doc) {
    var docService = this._docService;
      docService.getTrees(doc).subscribe(function(data ) {
        console.log(data);
        console.log(docService.json2xml(data));

      });
      return;

    var docService = this._docService;
    if (!$event.target.href) {
      $event.preventDefault();
      docService.getTrees(doc).subscribe(function(data ) {
        console.log(data);
        $event.target.href = 'data:text/xml,' + docService.json2xml(data);
        setTimeout(function() {
          $event.target.click();
        });
      });
    }
  }
});

module.exports = ViewComponent;
