var $ = require('jquery');
var URI = require('urijs')
, UIService = require('./services/ui')

var ExtractXMLDocComponent = ng.core.Component({
  selector: 'tc-managemodal-extract-xml-doc',
  templateUrl: '/app/extractxmldoc.html',
  inputs : ['document'],
  directives: [
    require('./directives/modaldraggable'),
  ],
}).Class({
  constructor: [UIService, function(uiService) {
    var self=this;
    $('#manageModal').width("510px");
    $('#manageModal').height("600px");
    this.message=this.success="";
    this.uiService = uiService;
    this.uiService.sendXMLData$.subscribe(function(xmldata) {
      self.outputXML=xmldata;
    });
    this.state = uiService.state;
  }],
  closeModalEXD: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  }
});

module.exports = ExtractXMLDocComponent;
