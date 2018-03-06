var $ = require('jquery');
var URI = require('urijs')
  , Router = ng.router.Router
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddDocumentChoiceComponent = ng.core.Component({
  selector: 'tc-managemodal-adddocument-choice',
  templateUrl: '/app/adddocumentchoice.html',
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [Router, DocService, UIService, function(
    router, docService, uiService
  ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:"", label: 'text'};
    $('#manageModal').width("480px");
    $('#manageModal').height("170px");
    this.message="";
    this.success="";
    this._uiService = uiService;
    this.community=uiService.state.community;
    this._docService = docService;
    this._router = router;
    /*this for scope variables */
    this.state = uiService.state;
  }],
  closeModalADC: function() {
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    this.doc = {name:"", label: 'text'};
    $('#manageModal').modal('hide');
  },
  byPage: function() {
    this._uiService.manageModal$.emit({type: "add-document"});
  },
  fromIIIF: function() {
    this._uiService.manageModal$.emit({type: "add-IIIF-document", community: this.community});
  },
  xmlFile: function() {
    this._uiService.manageModal$.emit({type: "add-xml-document", community: this.community});
  },
});
module.exports = AddDocumentChoiceComponent;
