function createModuleQueue (lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    lib = require('allexlib'),
    Allex = require('allex_allexjshelperssdklib')(lib),
    install = require('allex_npminstallserverruntimelib')(lib),
    Q = lib.q,
    AllexQ = lib.qlib;

  function ModulesQueue (reader) {
    this.reader = reader;
  }


  ModulesQueue.prototype.destroy = function () {
    this.reader = null;
  };

  ModulesQueue.prototype.install = function () {
    var unresolved = this.reader.getUnresolvedComponents();
    console.log('---------------------------------------------',unresolved);
    if (!unresolved.length) return Q.resolve(true); //nothing to be done ...
    return (new AllexQ.PromiseExecutorJob(unresolved.map (this._prepare_queue.bind(this)))).go();
  };


  ModulesQueue.prototype._prepare_queue = function (module_name) {
    return this._install_module.bind(this, module_name);
  };

  ModulesQueue.prototype._install_module = function (module_name) {
    if (!lib.moduleRecognition(module_name)) {
      return Q.reject('Unable to install non allex module, revisit configuration: '+module_name);
    }
    ///install only modules you haven't found 
    var d = Q.defer();
    Node.info('Will install module', module_name);
    install(this._onDone.bind(this, d, module_name), module_name, this.reader.cwd);
    return d.promise;
  };

  ModulesQueue.prototype._onDone = function (d, module_name, resp) {
    if (resp) {
      this.reader.storeComponent(module_name, Path.resolve(this.reader.cwd, 'node_modules', module_name))
      d.resolve(module_name);
    }else{
      d.reject(module_name);
    }
  };


  return ModulesQueue;
}

module.exports = createModuleQueue;

