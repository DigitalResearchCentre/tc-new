var $ = require('jquery');
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var NewPageProseComponent = ng.core.Component({
  selector: 'tc-newpage-prose',
  templateUrl: '/community/manage/tmpl/new-page-prose.html',
  inputs: [ 'entity', 'community',],
}).Class({
  constructor: [ function() {
    var bill="fred";
  }],
});

module.exports = NewPageProseComponent;
