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
    if (this.image) {
      $.get(config.IIIF_URL + this.image + '/info.json', function(source) {
        if (viewer) viewer.open([source]);
      });
    }
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
      docService.getRevisions(page).subscribe(function(revisions) {
        self.revisions = revisions;
        if (_.isEmpty(revisions)) {
          docService.getTextTree(page).subscribe(function(teiRoot) {
            var dbRevision = self.json2xml(teiRoot);
            docService.addRevision({
              doc: page.getId(),
              text: dbRevision,
              committed: new Date(),
              status: 'COMMITTED',
            }).subscribe(function(revision) {
              self.revisions.shift(revision);
            });
            self.setContentText(dbRevision);
          });
        } else {
          self.setContentText(_.get(revisions, '0.attrs.text', ''));
        }
      });

      if (image && image != this.image) {
        this.onPageChange();
      }
    }
  },
  setContentText: function(contentText) {
    this.page.contentText = contentText;
    if (this.page.attrs.children.length === 0 && this.revisions.length === 0) {
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
    var id = $event.target.value
      , revisions = this.revisions
    ;
    var revision = _.find(revisions, function(revision) {
      return revision._id === id;
    });
    this.setContentText(_.get(revision, 'attrs.text', ''));
  },
  revisionCompareChange: function($event) {
    var revision = this.revisions[$event.target.value];
    //this.contentText = revision.attrs.text;
  },
  save: function() {
    var page = this.page
      , docService = this._docService
      , self = this
    ;
    docService.addRevision({
      doc: page.getId(),
      text: page.contentText,
      status: 'IN_PROGRESS',
    }).subscribe(function(revision) {
      self.revisions.shift(revision);
    });
  },
  preview: function() {
    //parse first!
    var self = this
      , page = this.page
    ;
    $.post(config.BACKEND_URL+'validate'+'id='+this.community.attrs._id, {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+this.page.contentText+"</TEI>",
    }, function(res) {
//      console.log(res);
      self._uiService.manageModal$.emit({
          type: 'preview-page',
          page: page,
          error: res.error,
          content: page.contentText,
          lines: page.contentText.split("\n")
        });
    });
  },
  commit: function() {
    var page = this.page;
    var docService = this._docService;
    docService.commit({
      doc: {
        _id: page.getId(),
        label: page.attrs.label,
        name: page.attrs.name,
      },
      text: page.contentText,
    }).subscribe(function(res) {
      docService.fetch(page.getId(), {
        populate: JSON.stringify('revisions'),
      }).subscribe();
    });
  },
});

module.exports = ViewerComponent;
