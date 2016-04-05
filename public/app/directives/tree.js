var EventEmitter = ng.core.EventEmitter;

var Tree = ng.core.Class({
  constructor: [function() { 
    this.expand = new EventEmitter();
    this.select = new EventEmitter();
  }],
  ngOnInit: function() {
  },
  onToggle: function(node) {
    node.expand = !node.expand;
    if (node.expand) {
      this.expand.emit(node);
    }
  },
  onExpand: function(node) {
    this.expand.emit(node);
  },
  onSelect: function(node) {
    this.select.emit(node);
  },
});

ng.core.Component({
  selector: 'tc-tree',
  templateUrl: '/app/directives/tree.html',
  directives: [
    Tree,
  ],
  inputs: [
    'node',
  ],
  outputs: [
    'expand', 'select'
  ]
})(Tree);


module.exports = Tree;

