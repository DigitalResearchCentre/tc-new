var $ = require('jquery')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , RESTService = require('./services/rest')
;

var self;
var uploaded=false;

var ParseXMLLoadComponent = ng.core.Component({
  selector: 'tc-managemodal-parse-xmlload',
  templateUrl: '/app/parsexmlload.html',
  directives: [
    require('./directives/modaldraggable'),
  ],
  inputs: [
    'error', 'lines', 'docname'
  ],
}).Class({
  constructor: [UIService, DocService, RESTService, function(uiService, docService, restService) {
    self=this;
    this.uiService = uiService;
    this.docService = docService;
    this.restService = restService;
    $('#manageModal').width("510px");
    $('#manageModal').height("600px");
    this.message=this.success="";
  }],
  ngOnInit: function() {
  },
  closeModalXMLP: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  }
});

module.exports = ParseXMLLoadComponent;
