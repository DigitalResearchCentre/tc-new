var ElementRef = ng.core.ElementRef
  , CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , $ = require('jquery')
  , OpenSeadragon = require('openseadragon')
  , config = require('../config')
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
    });
    this.viewer = viewer;
    this.onPageChange();
    this.onResize();
    //var $imageMap = $('.image_map');
    //var options = {zoom: 2 , minZoom: 1, maxZoom: 5};
  },
  onPageChange: function() {
    var viewer = this.viewer;
    this.image = this.page.attrs.image;

    $.get(config.IIIF_URL + this.image + '/info.json', function(source) {
      if (viewer) viewer.open([source]);
    });
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
      , image = _.get(page, 'attrs.image')
      , self = this
    ;
    if (page) {
      if (image && image != this.image) {
        this.onPageChange();
      }
      docService.page=page;
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
      this._uiService.manageModal$.emit({
        type: 'edit-new-page',
        page: this.page,
      });
    }
  },
  json2xml: function(data) {
    return this._docService.json2xml(data);
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
  preview: function() {
    //parse first!
    var self=this;
    $.post(config.BACKEND_URL+'validate', {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+this.page.contentText+"</TEI>",
    }, function(res) {
//      console.log(res);
      self._uiService.manageModal$.emit({
          type: 'preview-page',
          page: self.page,
          error: res.error,
          content: self.page.contentText,
          lines: self.page.contentText.split("\n")
        });
    });
  },
  commit: function() {
    var page = this.page;
    var docService = this._docService;
    docService.commit({
      doc: page,
      text: this.page.contentText,
    }).subscribe(function(res) {
      docService.fetch(page.getId(), {
        populate: JSON.stringify('revisions'),
      }).subscribe();
    });
  },
});

module.exports = ViewerComponent;
