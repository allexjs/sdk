'use strict';

function createModuleClone (Lib, Node) {
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

  function Cloner (module, options) {
    this.modulename = module;
    this.module = null; //decode(module);
    this.module_link_path = null;
    this.allex_path = null;
    BaseWSWorkerClass.call(this, options);
  }

  Lib.inherit(Cloner, BaseWSWorkerClass);
  Cloner.prototype.destroy = function () {
    this.module = null;
    this.module_link_path = null;
    this.allex_path = null;
    this.modulename = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  Cloner.prototype.doSymlink = function () {
    Fs.symlinkSync(this.allex_path, this.module_link_path);
    AllexJS.storeToAllexJS('modules', this.module.name, this.module);
  };

  Cloner.prototype.go = function () {
    var modulename = this.modulename;
    this.modulename = null;
    if (!modulename) {
      this.onDecoded(this.module);
    } else {
      decode(modulename).then(this.onDecoded.bind(this));
    }
  };

  Cloner.prototype.onDecoded = function (module) {
    /*

    TODO: See about this
    if (Fs.existsSync(this.module_link_path)) {
      if (this.options.force) {
        Node.warn(this.module_link_path, 'already exists but will be removed due to --force option');
        Fs.removeSync(this.module_link_path);
      }else{
        throw new Error(this.module_link_path+' already exists, cowardly retreating');
      }
    }
    */
    if (module) {
      this.module = module;
      this.allex_path = Path.resolve(ALLEX_DIR, this.module.rtarget);
    }
    //check if there is a module in allex ...
    if (Fs.dirExists(this.allex_path)) {
      //dir exists, if it is a git repo, do just symlink
      if (Git.isClone(this.allex_path)) {
        Node.info ('Already is a clone, will do symlink');
        this.readCloneData();
        return this.doSymlink();
      }else{
        Node.info('A non git version detected at '+this.allex_path+' , will remove it and clone a git ...');
        Fs.removeSync(this.allex_path);
      }
    }

    Node.info ('About to clone module '+this.module.modulename);
    Git.clone (this.module.gitclonestring, this.allex_path).done(this.processClone.bind(this) , this.exit.bind(this));
  };

  Cloner.prototype.readCloneData = function () {
    var package_data = Node.packageRead(false, false, this.allex_path), 
        new_allex_path = Path.resolve(ALLEX_DIR, 'node_modules', package_data.name),
        new_link_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'modules', package_data.name);

    this.module.name = package_data.name;
    this.module_allex_path = new_allex_path;
    this.module_link_path = new_link_path;

  };

  Cloner.prototype.processClone = function (result)  {
    try {
      this.readCloneData();
      if (this.module_allex_path !== this.allex_path){
        Node.executeCommandSync('mv '+this.allex_path+' '+this.module_allex_path);
        this.allex_path = this.module_allex_path;
      }
    }catch (e) {
      Node.warn ('Unable to read package.json:', e);
      this.module_link_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'modules', this.module.modulename);
    }

    this.doSymlink();
    this.linkTestInterface();
    this.destroy();
  };

  Cloner.prototype.linkTestInterface = function () {
    var test_web_path = Path.resolve(this.module_link_path, 'test', 'web');
    if (!Fs.dirExists(Path.resolve(test_web_path))) return;

    var webapps = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', '_module');
    Fs.ensureDirSync(webapps);
    Fs.symlinkSync(Path.resolve(test_web_path, '_generated'), Path.resolve(webapps, this.module.name));
  };

  return function (module, options) {
    if (!module) return Q.reject('No module');
    var c = new Cloner(module, options);
    return c.defer.promise;
  };
}

module.exports = createModuleClone;
