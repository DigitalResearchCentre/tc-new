var $ = require('jquery');

var NewPagePoetryComponent = ng.core.Component({
  selector: 'tc-newpage-poetry',
  templateUrl: '/app/directives/new-page-poetry.html',
  inputs: [ 'entity', 'page'],
}).Class({
  constructor: [ function() {
  }],
});

module.exports = NewPagePoetryComponent;
