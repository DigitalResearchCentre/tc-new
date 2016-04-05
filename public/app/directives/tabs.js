var ContentChildren = ng.core.ContentChildren;

var Tab = ng.core.Component({
  selector: 'tc-tab',
  inputs: [
    'title', 'active',
  ],
  template: `
    <div class="tab-content" [hidden]="!active"> 
      <ng-content></ng-content>
    </div>
  `,
}).Class({
  constructor: function() {
    
  },
});

window.tabs = [];
console.log(Tab);
console.log(new ng.core.ContentChildren(Tab));
var Tabs = ng.core.Component({
  selector: 'tc-tabs',
  template: `
    <ul class="nav nav-tabs">
      <li *ngFor="#tab of tabs" (click)="active(tab)" 
        [class.active]="tab.active"><a>{{tab.title}}</a></li>
    </ul>
    <ng-content></ng-content>
  `,
  queries: {
    tabs: 'tc-tab',
  },
  directives: [Tab],
}).Class({
  constructor: [function() { 
    this._activeTab = null;
  }],
  ngAfterContentInit: function() {
    var tabs = this.tabs.filter(function(tab) {
      return tab.active;
    });
    window.tabs.push(this.tabs);
    console.log(this.tabs.filter(()=>true));
    if (tabs.length > 0) {
      tabs.forEach(function(tab) {
        tab.active = false;
      });
      this.active(tabs.first);
    } else if (this.tabs.length > 0){
      this.active(this.tabs.first);
    }
  },
  active: function(tab) {
    if (this._activeTab !== null) {
      this._activeTab.active = false;
    }
    tab.active = true;
    this._activeTab = tab;
  },
});

module.exports = {
  TAB_DIRECTIVES: [Tabs, Tab],
  Tabs: Tabs,
  Tab: Tab,
};




