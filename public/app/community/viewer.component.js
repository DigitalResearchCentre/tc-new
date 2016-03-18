var ElementRef = ng.core.ElementRef
  , CommunityService = require('../services/community')
  , UIService = require('../ui.service')
  , DocService = require('../services/doc')
  , $ = require('jquery')
  , OpenSeadragon = require('openseadragon')
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
  constructor: [DocService, UIService, ElementRef, function(
    docService, uiService, elementRef
  ) {
    this._docService = docService;
    this._uiService = uiService;
    this._elementRef = elementRef;

    this.revisions = [];
  }],
  ngOnInit: function() {
    var self = this
      , community = this.community
      , $el = $(this._elementRef.nativeElement)
      , width = $el.width()
      , height = $el.height()
    ;
    var viewer = OpenSeadragon({
      id: 'imageMap',
      prefixUrl: '/images/',
      preserveViewport: true,
      visibilityRatio:    1,
      defaultZoomLevel:   1,
      sequenceMode:       true,
      // TODO:  
      // while uploading, we need make:
      // image name as page name, order by name, reorder, rename
      tileSources: [{
        "profile": [
          "http://iiif.io/api/image/2/level2.json",
          {
            "supports": [
              "canonicalLinkHeader", "profileLinkHeader", "mirroring",
              "rotationArbitrary", "sizeAboveFull", "regionSquare"
            ], 
            "qualities": [
              "default", "color", "gray", "bitonal"
            ], 
            "formats": [
              "jpg", "png", "gif", "webp"
            ]
          }
        ], 
        "protocol": "http://iiif.io/api/image",
        "sizes": [],
        "height": 1479,
        "width": 2334,
        "@context": "http://iiif.io/api/image/2/context.json",
        "@id": "http://206.12.59.55:5004/Ad147r.jpg"
      }]
    });
    this.viewer = viewer;
    this.onResize();
    //var $imageMap = $('.image_map');
    //var options = {zoom: 2 , minZoom: 1, maxZoom: 5};

    this.links = {prev: [], next: []};
    this.prevLink = null;
    this.nextLink = null;
  },
  onResize: function() {
    if (!this.viewer) return;
    var viewport = this.viewer.viewport
      , x = viewport.containerSize.x
      , y = viewport.containerSize.y
      , w = x / 2334
      , h = y / 1479
    ;
    viewport.minZoomImageRatio = w > h ? h / w : 1;
  },
  ngOnChanges: function() {
    var docService = this._docService
      , page = this.page
      , self = this
    ;
    if (page) {
      docService.page=page;
      docService.getLinks(this.page).subscribe(function(data) {
        _.forEachRight(data.prev, function(el) {
          if (el.name === '#text' || el.name === 'pb') {
            data.prev.pop();
          } else {
            return false;
          }
        });
        _.forEachRight(data.next, function(el) {
          if (el.name === '#text' || el.name === 'pb') {
            data.next.pop();
          } else {
            return false;
          }
        });
        self.links = data;
        self.prevLink = _.last(data.prev);
        self.nextLink = _.last(data.next);
      });
      docService.getTrees(this.page).subscribe(function(teiRoot) {
        self.dbText = docService.json2xml(teiRoot);
        self.setContentText(self.dbText);
      });
    }
  },
  setContentText: function(contentText) {
    this.page.contentText = contentText;
    if (this.page.attrs.children.length === 0 && 
        this.page.attrs.revisions.length === 0) {
//    if (contentText === "<text><body/></text>") {
      this._uiService.manageModal$.emit({
        type: 'edit-new-page',
        page: this.page,
      });
    }
  },
  json2xml: function(data) {
    return this._docService.json2xml(data);
  },
  prevLinkChange: function($event) {
    this.prevLink = this.links.prev[$event.target.value];
  },
  nextLinkChange: function($event) {
    this.nextLink = this.links.next[$event.target.value];
  },
  revisionChange: function($event) {
    var index = $event.target.value
      , revisions = this.page.attrs.revisions
    ;
    if (index === 0) {
      this.setContentText(this.dbText);
    } else {
      this.setContentText(revisions[index-1].attrs.text);
    }
  },
  revisionCompareChange: function($event) {
    var revision = this.page.attrs.revisions[$event.target.value];
    //this.contentText = revision.attrs.text;
  },
  save: function() {
    var page = this.page
      , docService = this._docService
    ;
    docService.update(page.getId(), {
      revision: this.page.contentText,
    }).subscribe(function() {
      docService.fetch(page.getId(), {
        populate: JSON.stringify('revisions'),
      }).subscribe();
    });
  },
  commit: function() {
    var links = this.links;
    var page = this.page;
    var docService = this._docService;
    docService.commit({
      doc: page,
      text: this.page.contentText,
      links: {
        prev: links.prev.slice(0, _.findIndex(links.prev, this.prevLink) + 1),
        next: links.next.slice(0, _.findIndex(links.next, this.nextLink) + 1),
      },
    }).subscribe(function(res) {
      docService.fetch(page.getId(), {
        populate: JSON.stringify('revisions'),
      }).subscribe();
    });
  },
});

module.exports = ViewerComponent;
