var $ = require('jquery');
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var NewPagePlainComponent = ng.core.Component({
  selector: 'tc-newpage-plain',
  templateUrl: '/app/directives/new-page-plain.html',
  inputs: [ 'entity', 'page',],
}).Class({
  constructor: [ function() {
  }],
  ngOnInit: function() {
    if (this.page.attrs.facs) this.facs=' facs="'+this.page.attrs.facs+'"';
    else this.facs="";
  }
});

module.exports = NewPagePlainComponent;
