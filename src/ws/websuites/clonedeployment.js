'use strict';

function createCloneDeployment (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q,
    WebAppTools = require('../../webalizer')(Lib).WebAppTools;

  function Cloner (gitpath, options) {
    this.gitpath = gitpath;
    this.project = options.project;
    this.name = options.name;
    this.project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', this.project, 'webdeployments');
    this.target_path = Path.resolve(this.project_path, this.name);
    this.temp_dir = Path.resolve(ALLEX_WORKSPACE_DIR, '.tmp', 'webd', this.project);
    this.apps_path = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', this.project, this.name);
    BaseWSWorkerClass.call(this, options);
  }
  Lib.inherit (Cloner, BaseWSWorkerClass);
  Cloner.prototype.destroy = function () {
    this.gitpath = null;
    this.project = null;
    this.name = null;
    this.project_path = null;
    this.target_path = null;
    this.temp_dir = null;
    this.apps_path = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  Cloner.prototype.go = function () {
    if (Fs.existsSync(this.project_path)) {
      if (Fs.existsSync(this.target_path)) {
        if (this.options.force) {
          Node.warn(this.target_path, 'already exists, moving on due to --force option');
          Fs.removeSync(this.target_path);
        }else{
          throw new Error(this.target_path+' alread exists');
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
    var source = Path.resolve(this.temp_dir, Git.getRepoName(this.gitpath));
    Fs.renameSync(source, this.target_path);
    AllexJS.storeToAllexJS('webdeployments', AllexJS.solutionKey(this.project, this.name), {
      git: this.gitpath,
      project: this.project,
      name: this.name
    });

    Fs.ensureDirSync(Path.dirname(this.apps_path));
    Fs.symlinkSync(this.target_path, this.apps_path);
    Lib.runNext(this.destroy.bind(this));
  }

  return function (project, gitpath, options) {
    if (!project) return Q.reject('No project');
    if (!gitpath) return Q.reject('No gitpath');
    var d = new Cloner(project, gitpath, options);
    return d.defer.promise;
  };
}

module.exports = createCloneDeployment;

