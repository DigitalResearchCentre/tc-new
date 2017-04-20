var $ = require('jquery');
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var NewPageEmptyComponent = ng.core.Component({
  selector: 'tc-newpage-empty',
  templateUrl: '/app/directives/new-page-empty.html',
  inputs: [ 'entity', 'page',],
}).Class({
  constructor: [ function() {
  }],
  ngOnInit: function() {
    if (this.page.attrs.facs) this.facs=' facs="'+this.page.attrs.facs+'"';
    else this.facs="";
  }
});

module.exports = NewPageEmptyComponent;
