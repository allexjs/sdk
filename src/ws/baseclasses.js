
function createBaseClasses (Lib, AllexJS) {
  'use strict';
  var Q = Lib.q;

  function BaseWSWorkerClass (options) {
    if (!this.success_string) {
      this.success_string = "Successfully done";
    }
    this.options = Lib.extend({}, options);
    this.defer = Q.defer();

    try {
      this.go();
    }catch (e) {
      console.log(e.stack);
      Lib.runNext(this.exit.bind(this, e.toString()));
    }
  }

  BaseWSWorkerClass.prototype.destroy = function () {
    this.options = null;
    if (this.defer) {
      this.defer.resolve(this.success_string);
    }
    this.success_string = null;
    this.defer = null;
    AllexJS.destroyTmpDir();
  };

  BaseWSWorkerClass.prototype.exit = function () {
    if (this.defer) {
      this.defer.reject (Array.prototype.join.call(arguments, ' '));
    }
    this.defer = null;
    this.destroy();
  };

  return {
    BaseWSWorkerClass : BaseWSWorkerClass
  };
}

module.exports = createBaseClasses;
