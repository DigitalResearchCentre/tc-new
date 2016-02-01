var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ManageModalChoiceComponent = ng.core.Component({
  selector: 'tc-managemodal-adddocument',
  templateUrl: '/community/manage/tmpl/add-document.html'
}).Class({
  constructor: [UIService, function(uiService) {
    this._uiService = uiService;
    this.message="hello";
    this.success="hello";
    /*this for scope variables */
  }],
});

module.exports = ManageModalChoiceComponent;
