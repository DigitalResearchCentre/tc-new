var CommunityService = require('../services/community')
  , Viewer = require('./viewer.component')
  , UIService = require('../services/ui')
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
    require('../directives/tabs').TAB_DIRECTIVES,
    require('../directives/splitter').SPLITTER_DIRECTIVES,
    Viewer,
  ],
  queries: {
    viewer: new ng.core.ViewChild(Viewer),
  },
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
  onResize: function($event) {
    if (this.viewer) {
      this.viewer.onResize();
    }
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
  addFirstPage: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      parent: doc,
    });
  },
  addPageAfter: function(page) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      after: page,
    });
  },
  toggleEntity: function() {

  },
  selectEntity: function() {

  },
  extractXML: function($event, doc) {
    var self=this;
    var docService = this._docService;
    self._uiService.manageModal$.emit("extract-xml-doc");
    docService.getTextTree(doc).subscribe(function(teiRoot) {
      self._uiService.sendXMLData$.emit(docService.json2xml(teiRoot));
    });
  }
});

module.exports = ViewComponent;
