var Http = ng.http.Http
  , RESTService = require('./rest')
;

var RevisionService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [Http, function(http){
    var self = this;
    RESTService.call(this, http);

    this.resourceUrl = 'revisions';
  }],
});

module.exports = RevisionService;
