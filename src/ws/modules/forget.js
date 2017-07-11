'use strict';

function createModuleForget (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    ALLEX_DIR = AllexJS.ALLEX_DIR,
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    decode = require('../../../lib/switchgitdecoder.js')(Lib, Node);

  function Forget (module, options) {
    this.modulename = module;
    this.module = null;
    this.module_link_path = null;
    this.module_allex_path = null;
    this.allex_path = null;
    BaseWSWorkerClass.call(this, options);
  }
  Lib.inherit(Forget, BaseWSWorkerClass);
  Forget.prototype.destroy = function () {
    this.allex_path = null;
    this.module_allex_path = null;
    this.module_link_path = null;
    this.module = null;
    this.modulename = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  Forget.prototype.go = function () {
    var modulename = this.modulename;
    this.modulename = null;
    if (modulename) {
      decode(modulename).then(this.onDecoded.bind(this, modulename));
    } else {
      this.onDecoded()
    }
  };

  Forget.prototype.onDecoded = function (modulename, module) {
    if (module) {
      if (module.modulename) {
        module = module.modulename;
      } 
    } else {
      module = modulename;
    }
    this.module = AllexJS.readFromAllexJS ('modules', module);
    if (!this.module) throw new Error('Module '+module+' is not in workspace');
    this.module_link_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'modules', this.module.modulename);
    this.allex_path = Path.resolve(ALLEX_DIR, this.module.rtarget);
    this.reallyGo();
  };

  Forget.prototype.reallyGo = function () {
    var ap_e = Fs.existsSync(this.allex_path);
    if (ap_e){
      if (Git.isClone(this.allex_path)){
        if (!Git.isDirClear (this.allex_path)) {
          if (this.options.force) {
            Node.warn ('There are some git issues in', this.allex_path, 'but will move on due to --force');
          }else{
            throw new Error('Seems there are some git issues in dir '+this.allex_path+', review them and try again later');
          }
        }
      }
    }

    if (Fs.existsSync(this.module_link_path)){
      Node.info('Will remove', this.module_link_path);
      Fs.removeSync(this.module_link_path);
    }

    if (ap_e){
      Node.info('Will remove', this.allex_path);
      Fs.removeSync(this.allex_path);
    }
    Node.info('Will npm install git+ssh://'+this.module.gitclonestring);
    //Node.executeCommand('allex-npm-install '+this.module.name, null, {
    Node.executeCommand('npm install git+ssh://'+this.module.gitclonestring, null, {
      cwd : AllexJS.ALLEX_DIR
    }).done(this.done.bind(this), this.exit.bind(this));
  };

  Forget.prototype.done = function () {
    AllexJS.removeFromAllexJS('modules', this.module.modulename);
    Lib.runNext(this.destroy.bind(this));
  };

  return function (module, options) {
    if (!module) return Q.reject('No module');
    var f = new Forget(module, options);
    return f.defer.promise;
  };
}

module.exports = createModuleForget;

