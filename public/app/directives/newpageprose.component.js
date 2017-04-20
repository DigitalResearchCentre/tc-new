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
      if (this.page.attrs.facs) this.facs=' facs="'+this.page.attrs.facs+'"';
      else this.facs="";
    }
});

module.exports = NewPageProseComponent;
