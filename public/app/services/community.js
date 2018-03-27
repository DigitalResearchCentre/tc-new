var Observable = Rx.Observable
  , Http = ng.http.Http
  , Inject = ng.core.Inject
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest')
  , UIService = require('./ui')
  , DocService = require('./doc')
  , Community = require('../models/community')
  , Doc = require('../models/doc')
  , User = require('../models/user')
;

var CommunityService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [
    Http, UIService, DocService,
    function(http, uiService, docService){
    RESTService.call(this, http);
    var self = this;

    this.resourceUrl = 'communities';
    this._uiService = uiService;
    this._docService = docService;

    uiService.communityService$.subscribe(function(event) {
      switch (event.type) {
        case 'refreshCommunity':
          self.refreshCommunity(event.payload).subscribe();
          break;
      }
    });
  }],
  modelClass: function() {
    return Community;
  },
  get: function(id) {
    return new Community({_id: id});
  },
  refreshPublicCommunities: function() {
    var uiService = this._uiService;
    return this.list({
      search: {
        find: JSON.stringify({public: true}),
      },
    }).map(function(communities) {
      uiService.setState('publicCommunities', communities);
      return communities;
    });
  },
  refreshCommunity: function(community) {
    return this.fetch(community.getId(), {
//      populate: JSON.stringify('documents')   //ok, this is slow with a community with lots of documents
    });
  },
  selectCommunity: function(community) {
    var uiService = this._uiService
      , docService = this._docService
    ;
    if (_.isString(community)) {
      community = this.get(community);
    }
    if (community && (uiService.state.community !== community)) {
      this.refreshCommunity(community).subscribe(function(community) {
        var thisdoc=getParameterByName('document', document.location.href);
        uiService.setState('community', community);
        if (thisdoc) {
          var docn=0;
          for (var i=0; i<community.attrs.documents.length; i++) {
            if (community.attrs.documents[i].attrs._id==thisdoc) docn=i;
          }
          docService.selectDocument(_.get(community, 'attrs.documents.'+docn, null));
        }  //don't default to first document
//        else docService.selectDocument(_.get(community, 'attrs.documents.0', null));
      });
    }
    uiService.setState('community', community);
  },
  createCommunity: function(communityData) {
    var uiService = this._uiService;
    return this.save(communityData).map(function(community) {
      uiService.createCommunity(community);
      return community;
    });
  },
  getMemberships: function(community) {
    var self = this;
    return this.http.get(
      this.url({
        id: community.getId(),
        func: 'memberships',
      }), this.prepareOptions({})
    ).map(function(res) {
      return res.json();
    });
  },
  _isRole: function(community, user, fn) {
    var memberships = _.get(user, 'attrs.memberships');
    return _.find(memberships, function (obj){
      return obj.community === community && fn(obj);
    });
  },
  isCreator: function(community, user) {
    return this._isRole(community, user, function(obj) {
      return obj.role === 'CREATOR';
    });
  },
  isLeader: function(community, user) {
    return this._isRole(community, user, function(obj) {
      return obj.role === 'LEADER';
    });
  },
  isMember: function(community, user) {
    return this._isRole(community, user, function(obj) {
      return obj.role === 'MEMBER';
    });
  },
  canAddDocument: function(community, user) {
    return this._isRole(community, user, function(obj) {
      return ['LEADER', 'CREATOR'].indexOf(obj.role);
    })
  },
  canJoin: function(community, user) {
    return user && !this._isRole(community, user, function(obj) {
      return true;
    }) && _.get(community, 'attrs.accept', false);
  },
  addDocument: function(community, doc) {
    var self = this;
    return this.http.put(
      this.url({
        id: community.getId(),
        func: 'add-document',
      }), JSON.stringify(doc), this.prepareOptions({})
    ).map(function(res) {
      self.fetch(community.getId(), {
        populate: JSON.stringify('documents')
      }).subscribe();
      return new Doc(res.json());
    });
  },
  addMember: function(community, user, role) {
    return this.http.put(
      this.url({
        id: community.getId(),
        func: 'add-member',
      }),
      JSON.stringify({
        user: user.getId(),
        role: role,
      }),
      this.prepareOptions({})
    ).map(function(res) {
      return new User(res.json());
    });
  },
});

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


module.exports = CommunityService;
