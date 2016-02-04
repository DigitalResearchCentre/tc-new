var CodeMirror = require('codemirror/lib/codemirror')
  , xmlmode = require('codemirror/mode/xml/xml')
  , $ = require('jquery')
  , ElementRef = ng.core.ElementRef
;

var CodeMirrorComponent = ng.core.Component({
  selector: 'tc-codemirror',
  template: '<textarea [(ngModel)]="content"></textarea>',
  input: [
    'content'
  ]
}).Class({
  constructor: [ElementRef, function(elementRef) { 
    this._elementRef = elementRef;
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
    editor.setValue(this.content);
    console.log(this.content);
  },
  textChange: function(instance) {
    var newValue = instance.getValue();
    if (newValue !== this.content) {
      this.content = newValue;
    }
  }
});

module.exports = CodeMirrorComponent;

