var $ = require('jquery');

var NewPagePoetryComponent = ng.core.Component({
  selector: 'tc-newpage-poetry',
  templateUrl: '/app/directives/new-page-poetry.html',
  inputs: [ 'entity', 'page'],
}).Class({
  constructor: [ function() {
  }],
  ngOnInit: function() {
    if (this.page.attrs.facs) this.facs=' facs="'+this.page.attrs.facs+'"';
    else this.facs="";
  }
});

module.exports = NewPagePoetryComponent;
