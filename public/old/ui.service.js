var EventEmitter = ng.core.EventEmitter
  , AuthService = require('./services/auth')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
;

var UIService = ng.core.Class({
  constructor: [AuthService, CommunityService, DocService,
    function(authService, communityService, docService){

    var self = this;
    this.loginModel$ = new EventEmitter();
    this.manageModal$ = new EventEmitter();
//    this.newPage$ = new EventEmitter();
    this.sendCommand$ = new EventEmitter();
    this.sendXMLData$ = new EventEmitter();
    this._communitySubject = new EventEmitter();
    this._communityService = communityService;
    this._docService = docService;

    authService.authUser$.subscribe(function(authUser) {
      if (authUser) {
        self.authUser = authUser;
        var memberships = authUser.attrs.memberships;
        if (!self._community && memberships.length === 1) {
          self.setCommunity(memberships[0].community);
        }
      }
    });
    this.community = null;
  }],
  setCommunity: function(community) {
    if (community !== this.community) {
      this.community = community;
      this._communityService.fetch(community.getId(), {
        populate: JSON.stringify('documents entities')
      }).subscribe();
      if (community && community.attrs.documents.length>0) {
        this.setDocument(community.attrs.documents[0]);
      }
    }
    return community;
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
    } else {
      this._docService.fetch(doc.getId(), {
        populate: JSON.stringify('children')
      }).subscribe();
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

    docService.getTextTree(page).map(function(teiRoot) {
      console.log(docService.json2xml(teiRoot));
    }).subscribe();
  },
});

module.exports = UIService;
