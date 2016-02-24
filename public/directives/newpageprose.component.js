var $ = require('jquery');
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var NewPageProseComponent = ng.core.Component({
  selector: 'tc-newpage-prose',
  templateUrl: '/directives/new-page-prose.html',
  inputs: [ 'entity',],
}).Class({
  constructor: [ function() {
  }],
});

module.exports = NewPageProseComponent;
