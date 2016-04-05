var EventEmitter = ng.core.EventEmitter
  , AuthService = require('./services/auth')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
  , Immutable = require('immutable')
;

var UIService = ng.core.Class({
  constructor: [AuthService, CommunityService, DocService,
    function(authService, communityService, docService){

    this.store = Immutable.Map({
      authUser: null,
      community: null,
    });
  }],
  selectCommunity: function(community) {
    this.store = this.store.set('community', community);
  },
  setDocument: function(doc) {
    var self =  this;
    if (doc !== this.document) {
      this.document = doc;
      this.document.expand = true;
      this._docService.fetch(doc.getId(), {
        populate: JSON.stringify('children'),
      }).subscribe(function(doc) {
        var first = _.first(doc.attrs.children);
        if (first) {
          self.selectPage(first);
        }
      });
    }
    return doc;
  },
  selectPage: function(page) {
    var docService = this._docService
      , self = this
    ;
    docService.fetch(page.getId(), {
      populate: JSON.stringify('children revisions')
    }).subscribe();

    docService.getTrees(page).map(function(teiRoot) {
      console.log(docService.json2xml(teiRoot));
    }).subscribe();
  },
});

module.exports = UIService;
