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
  selector: 'tc-tabs',
  styles: [
    ['.nav-tabs > li.active > a:focus, .nav-tabs > li.active > a {',
      'color: #555;',
      'background-color: #FFF;',
      'border: 1px solid #DDD;',
      'border-bottom-color: transparent;',
      'cursor: pointer;',
    '}'].join(' '),
    ['.nav-tabs > li > a {',
      'margin-right: 2px;',
      'line-height: 1.42857143;',
      'border: 1px solid transparent;',
      'border-radius: 4px 4px 0 0 ;',
    '}'].join(' '),
    ['.nav > li > a {',
      'position: relative;',
      'display: block;',
      'padding: 10px 15px;',
    '}'].join(' '),
    ['a {',
      'color: #337AB7;',
      'text-decoration: none;',
      'cursor: pointer;',
    '}'].join(' '),
  ],
  template: [
    '<ul class="nav nav-tabs">',
      '<li *ngFor="#tab of tabs" (click)="active(tab)"', 
        '[class.active]="tab.active"><a>{{tab.title}}</a></li>',
    '</ul>',
    '<ng-content></ng-content>'
  ].join(' '),
  queries: {
    tabs: new ng.core.ContentChildren(Tab),
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
    if (tabs.length > 0) {
      tabs.forEach(function(tab) {
        tab.active = false;
      });
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



