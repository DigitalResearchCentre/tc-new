
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

var Tabs = ng.core.Component({
  selector: 'tc-tabs',
  template: `
    <ul class="nav nav-tabs">
      <li *ngFor="#tab of tabs" (click)="active(tab)"
        [class.active]="tab.active"><a>{{tab.title}}</a></li>
    </ul>
    <ng-content></ng-content>
  `,
 directives: [Tab],
 queries: {
    tabs: new ng.core.ContentChildren(Tab),
  },
}).Class({
  constructor: [function() {
    this._activeTab = null;
  }],
  ngAfterContentChecked: function() {
    var tabs = this.tabs.filter(function(tab) {return tab.active;});
    if (tabs.length > 0) {
      tabs.forEach(function(tab) { tab.active = false; });
      this.active(tabs[0]);
    } else if (this.tabs.length > 0){
      this.active(this.tabs[0]);
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
