var CodeMirror = require('codemirror/lib/codemirror')
  , xmlmode = require('codemirror/mode/xml/xml')
  , $ = require('jquery')
  , EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
;

var CodeMirrorComponent = ng.core.Component({
  selector: 'tc-codemirror',
  template: '<textarea [(ngModel)]="content"></textarea>',
  inputs: [
    'content'
  ],
  outputs: [
    'contentChange',
  ]
}).Class({
  constructor: [ElementRef, function(elementRef) { 
    this._elementRef = elementRef;

    this.contentChange = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , editor
    ;
    editor = CodeMirror.fromTextArea($(el).find('textarea')[0], {
      lineWrapping: true,
      lineNumbers: true,
      mode:  'xml'
    });
    editor.on('change', this.textChange.bind(this));
    editor.setValue(this.content || '');
    this.editor = editor;
  },
  ngOnChanges: function(changeRecord) {
    var editor = this.editor;
    if (editor) {
      if (this.content !== editor.getValue()) {
        editor.setValue(this.content || '');
      }
    }
  },
  textChange: function(instance) {
    var newValue = instance.getValue();
    if (newValue !== this.content) {
      this.content = newValue;
      this.contentChange.emit(newValue);
    }
  },
});

module.exports = CodeMirrorComponent;

