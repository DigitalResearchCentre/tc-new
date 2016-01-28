var ContentChildren = ng.core.ContentChildren;

var Tab = ng.core.Component({
  selector: 'tc-tab',
  inputs: [
    'title', 'active',
  ],
  template: '<div [hidden]="!active"><ng-content></ng-content></div>',
}).Class({
  constructor: function() {
    
  },
});

var Tabs = ng.core.Component({
  selector: 'tabs',
  templateUrl: '/app/tabs.html',
  queries: {
    hello: new ContentChildren(Tab),
    world: new ng.core.ViewChildren(Tab),
  },
  directives: [Tab],
}).Class({
  constructor: [function() { 
    this._activeTab = null;
  }],
  ngAfterContentInit: function() {
    console.log(this.hello);
    console.log(this.world);
    window.tabs = this.hello;
  },
  ngAfterViewInit: function() {
    console.log(this.hello);
    console.log(this.world);
    window.tt = this.world;
  },
  activeTab: function(tab) {
    if (this._activeTab !== null) {
      this._activeTab.active = false;
    }
    tab.active = true;
    this._activeTab = tab;
  },
});

module.exports = Tabs;



