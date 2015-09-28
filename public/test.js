var d1 = {
  name: 'D1',
  children: [{
      name: '1r',
      children: [{
        name: 1,
        texts: ['lb1']
      }, {
        name: 2,
        texts: ['lb21', 'lb22']
      }],
  }, {
    name: '1v',
    children: [],
  }],
};

var w1 = {
  name: 'W1',
  children: [{
    name: '1',
    children: [],
  }, {
    name: '2',
    children: [],
  }]
};

var texts = {
  lb1: {
    text: 'hello world',
    doc: ['D1', '1r', '1'],
    work: ['W1', '1'],
    xml: ['text', 'body', 'div', 'l'],
  },
  lb21: {
    text: 'foo bar',
    doc: ['D1', '1r', '2'],
  },
  lb22: {
    text: 'bye',
    doc: ['D1', '1r', '2'],
  }
};

var t1 = {
  name: 'text',
  children: [{
    name: 'body',
    children: [{
      name: 'div',
      children: [{
        name: 'lb',
      }, {
        name: 'l',
        children: [
          {text: 'lb1'},
          {
            name: 'lb',
          },
          {text: 'lb21'},
        ],
      }, {
        name: 'lb',
      }, {
        name: 'l',
        children: [
          {text: 'lb22'},
        ]
      }]
    }]
  }]
};
