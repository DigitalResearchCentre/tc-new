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
  constructor: [DocService, UIService, function(
    docService, uiService
  ) {
    this._docService = docService;
    this._uiService = uiService;
    
    this.revisions = [];
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
    this.links = {prev: [], next: []};
    this.prevLink = null;
    this.nextLink = null;
  },
  ngOnChanges: function() {
    var docService = this._docService
      , page = this.page
      , self = this
    ;
    if (page) {
      docService.getLinks(this.page).subscribe(function(data) {
        _.forEachRight(data.prev, function(el) {
          console.log(el);
          console.log(el.name);
          console.log(el.name === 'pb');
          if (el.name === '#text' || el.name === 'pb') {
            data.prev.pop();
          } else {
            return false;
          }
        });
        _.forEachRight(data.next, function(el) {
          console.log(el);
          console.log(el.name);
          console.log(el.name === 'pb');
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
        var firstText = teiRoot
          , parent, index
        ;
        while ((firstText.children || []).length > 0) {
          index = _.findIndex(firstText.children, function(child) {
            return !_.isString(child);
          });
          firstText.children = firstText.children.slice(index);
          parent = firstText;
          firstText = firstText.children[0];
        }
        if (parent) {
          self.pb = parent.children.shift();
          if (self.pb.name !== 'pb') {
            parent.children.unshift(self.pb);
            self.pb = null;
          }
        }
        var t  = docService.json2xml(teiRoot);
        self.contentText = self.dbText = t.replace('<pb/>', '') ;
      });
    } else {
      this.pb = null;
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
    if (index == 0) {
      this.contentText = this.dbText;
    } else {
      this.contentText = revisions[index-1].attrs.text;
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
      revision: this.contentText,
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
      text: this.contentText,
      docElement: true,
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


