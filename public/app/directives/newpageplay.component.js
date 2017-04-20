var $ = require('jquery');

var NewPagePlayComponent = ng.core.Component({
  selector: 'tc-newpage-play',
  templateUrl: '/app/directives/new-page-play.html',
  inputs: [ 'entity', 'page'],
}).Class({
  constructor: [ function() {
  }],
  ngOnInit: function() {
    if (this.page.attrs.facs) this.facs=' facs="'+this.page.attrs.facs+'"';
    else this.facs="";
  }
});

module.exports = NewPagePlayComponent;
