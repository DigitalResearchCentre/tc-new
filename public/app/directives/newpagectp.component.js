var $ = require('jquery');

var NewPageCTPComponent = ng.core.Component({
  selector: 'tc-newpage-ctp',
  templateUrl: '/app/directives/new-page-ctp.html',
  inputs: [ 'entity', 'page'],
}).Class({
  constructor: [ function() {
  }],
  ngOnInit: function() {
    if (this.page.attrs.facs) this.facs=' facs="'+this.page.attrs.facs+'"';
    else this.facs="";
  }
});

module.exports = NewPageCTPComponent;
