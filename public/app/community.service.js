var RESTService = require('./rest.service')
  , Http = ng.http.Http
;

var CommunityService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, function(http){
    RESTService.call(this, http);
    this.resourceUrl = 'communities';
  }],
  getMyCommunities: function() {
  },
  getPublicCommunities: function() {
    return this.list({
      search: 'find=' + JSON.stringify(
        {public: true}
      ),
    }).map(function(res) {
      return res.json();
    });
  },
});

module.exports = CommunityService;


