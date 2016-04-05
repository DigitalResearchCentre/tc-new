var $ = require('jquery');
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var NewPageProseComponent = ng.core.Component({
  selector: 'tc-newpage-prose',
  templateUrl: '/app/directives/new-page-prose.html',
  inputs: [ 'entity', 'page',],
}).Class({
  constructor: [ function() {
  }],
    ngOnInit: function() {
    }
});

module.exports = NewPageProseComponent;
