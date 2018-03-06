var EventEmitter = ng.core.EventEmitter;

var UIService = ng.core.Class({
  constructor: [function(){

    var self = this;
    this.state = {
      authUser: null,
      community: null,
      document: null,
      page: null,
      publicCommunities: [],
    };
    this.authService$ = new EventEmitter();
    this.communityService$ = new EventEmitter();
    this.docService$ = new EventEmitter();
    this.loginModel$ = new EventEmitter();
    this.manageModal$ = new EventEmitter();
    this.newPage$ = new EventEmitter();
    this.sendCommand$ = new EventEmitter();
    this.sendXMLData$ = new EventEmitter();
    this.requestEditorText$ = new EventEmitter();
    this.sendEditorText$ = new EventEmitter();
    this.nullEditor$ = new EventEmitter();
    this._communitySubject = new EventEmitter();
    this.choosePage$ = new EventEmitter();
    this.showDocument$ = new EventEmitter();
    this.changeMessage$ = new EventEmitter();
    this.community = null;
    window.state = this.state;
  }],
  setState: function(key, value) {
    return _.set(this.state, key, value);
  },
  loginRequired: function() {
    if (!this.state.authUser) {
      this.loginModel$.emit('show');
    }
  },
  createCommunity: function(community) {
    var state = this.state;
    state.community = community;
    if (community.attrs.public) {
      state.publicCommunities.push(community);
    }
    this.authService$.emit({
      type: 'refreshAuthUser',
    });
  },
  createDocument: function(doc) {
    var state = this.state;
    if (_.isEmpty(doc.attrs.ancestors)) {
      state.document = doc;
      this.communityService$.emit({
        type: 'refreshCommunity',
        payload: state.community,
      });
    } else {
      state.page = doc;
    }
   this.docService$.emit({   //causes sync problems on bulk update
      type: 'refreshDocument',
      payload: state.document,
    });
  }
});

module.exports = UIService;
