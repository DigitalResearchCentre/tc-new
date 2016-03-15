var $ = require('jquery');

var NewPagePlayComponent = ng.core.Component({
  selector: 'tc-newpage-play',
  templateUrl: '/directives/new-page-play.html',
  inputs: [ 'entity', 'page'],
}).Class({
  constructor: [ function() {
  }],
});

module.exports = NewPagePlayComponent;
