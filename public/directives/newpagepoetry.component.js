var $ = require('jquery');

var NewPagePoetryComponent = ng.core.Component({
  selector: 'tc-newpage-poetry',
  templateUrl: '/directives/new-page-poetry.html',
  inputs: [ 'entity',],
}).Class({
  constructor: [ function() {
  }],
});

module.exports = NewPagePoetryComponent;
