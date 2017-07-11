'use strict';

function createCloneToSuite (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    recognize = Lib.moduleRecognition,
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q,
    WebAppTools = require('../../webalizer')(Lib).WebAppTools;

  function Cloner (gitpath, options) {
    this.outergitpath = gitpath;
    this.gitpath = null;
    this.project = null;
    this.name = null;
    this.project_path = null;
    this.target_path = null;
    this.temp_dir = null;
    this.apps_path = null;

    BaseWSWorkerClass.call(this, options);

  }
  Lib.inherit(Cloner, BaseWSWorkerClass);
  Cloner.prototype.destroy = function () {
    if (Fs.existsSync(this.temp_dir)){
      Fs.removeSync(this.temp_dir);
    }
    this.apps_path = null;
    this.temp_dir = null;
    this.target_path = null;
    this.project_path = null;
    this.name = null;
    this.project = null;
    this.gitpath = null;
    this.outergitpath = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  Cloner.prototype.go = function () {
    var gitpath = this.outergitpath, recognized;
    this.outergitpath = null;
    if (gitpath) {
      recognize(gitpath, ['webapp']).then(this.onRecognized.bind(this, gitpath));
    }
  };
  Cloner.prototype.onRecognized = function (gitpath, recognized) {
    if (Lib.isString(recognized)) {
      this.project = this.options.project;
      this.gitpath = gitpath;
    }else if (recognized && 'object' === typeof recognized){
      this.gitpath = recognized.gitclonestring;
      this.project = recognized.namespace;
    }
    if (!this.gitpath) {
      this.exit(new Error('Unable to clone, no git path'));
      return;
    }
    if (!this.project){
      this.exit(new Error('Unable to move on, no project given'));
      return;
    }
    this.name = Git.getRepoName(this.gitpath);
    this.project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', this.project, 'websolutions');
    this.target_path = Path.resolve(this.project_path, this.name);
    this.temp_dir = Path.resolve(ALLEX_WORKSPACE_DIR, '.tmp', 'webs', this.project);
    this.apps_path = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', this.project, this.name);
    this.reallyGo();
  };
  Cloner.prototype.reallyGo = function () {
    if (Fs.existsSync(this.project_path)) {
      if (Fs.existsSync(this.target_path)) {
        if (this.options.force) {
          Node.warn(this.target_path, 'already exists, moving on due to --force option');
          Fs.removeSync(this.target_path);
        }else{
          this.exit(new Error(this.target_path+' already exists'));
          return;
        }
      }
    }else{
      Fs.ensureDirSync(this.project_path);
    }
    Fs.recreateDir(this.temp_dir);
    process.chdir(this.temp_dir);
    Git.clone (this.gitpath).done(this.processClone.bind(this), this.exit.bind(this));
  };

  Cloner.prototype.processClone = function (result) {
    var source = Path.resolve(this.temp_dir, this.name);
    Fs.renameSync(source, this.target_path);
    AllexJS.storeToAllexJS('websolutions', AllexJS.solutionKey(this.project, this.name), {
      git: this.gitpath,
      project: this.project,
      name: this.name
    });

    Fs.recreateDir(this.apps_path);
    WebAppTools.findWebApps (this.target_path).forEach (this.dodaLink.bind(this));
    Lib.runNext(this.destroy.bind(this));
  }

  Cloner.prototype.dodaLink = function (app) {
    var source = Path.resolve(this.project_path, this.name, app, '_generated'), 
      target = Path.resolve(this.apps_path, app),
      sdk_common = Path.resolve (__dirname, '..', '..', '..', 'templates', 'webapps');

    Fs.symlinkSync(source, target);
    if (!Fs.existsSync(Path.resolve(this.project_path, this.name, app,'layouts'))) Fs.symlinkSync (Path.join (sdk_common, 'layouts'), Path.resolve(this.project_path, this.name, app,'layouts'));
    if (!Fs.existsSync( Path.resolve(this.project_path, this.name, app, 'includes'))) Fs.symlinkSync (Path.join (sdk_common, 'includes'), Path.resolve(this.project_path, this.name, app, 'includes'));
  };


  return function (project, gitpath, options) {
    if (!project) return Q.reject('No project');
    if (!gitpath) return Q.reject('No gitpath');
    var d = new Cloner(project, gitpath, options);
    return d.defer.promise;
  };
}

module.exports = createCloneToSuite;

