var CodeMirror = require('codemirror/lib/codemirror')
  , xmlmode = require('codemirror/mode/xml/xml')
  , $ = require('jquery')
  , EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , UIService = require('../services/ui')
;

var CodeMirrorComponent = ng.core.Component({
  selector: 'tc-codemirror',
  template: '<textarea [(ngModel)]="content"></textarea>',
  changeDetection: ng.core.ChangeDetectionStrategy.OnPush,
  inputs: [
    'content', 'smartIndent',
  ],
  outputs: [
    'contentChange',
  ],
}).Class({
  constructor: [ElementRef, UIService, function(elementRef, uiService) {
    this._elementRef = elementRef;
    this._uiService=uiService;
    this.contentChange = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , editor
    ;
    editor = CodeMirror.fromTextArea($(el).find('textarea')[0], {
      lineWrapping: true,
      lineNumbers: true,
      smartIndent: this.smartIndent,
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


