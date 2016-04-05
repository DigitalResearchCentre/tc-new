tcHeader.$inject = [];
function tcHeader() {
  console.log('tc header');
  return {
    restrict: 'E',
    templateUrl: 'tc-header/tc-header.html',
    scope: {
      hide: '=',
    },
    controller: HeaderCtrl,
    controllerAs: 'vm',
  };
}

function HeaderCtrl() {
  var vm = this;

  vm.hide = false;
}

module.exports = tcHeader;
