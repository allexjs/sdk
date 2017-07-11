'use strict';

function createCloneToSuite (lib, Node) {
  'use strict';

var Fs = Node.Fs,
  Path = Node.Path,
  AllexJS = require('allex_allexjshelperssdklib')(lib),
  ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
  BaseWSWorkerClass = require('../baseclasses.js')(lib, AllexJS).BaseWSWorkerClass,
  Lib = require('allexlib'),
  Git = require('allex_githelperssdklib')(lib),
  Q = Lib.q; /*, will be left for tmux extensions
  GenerateScripts = require('../../system/generatescripts.js')(lib, Node, AllexJS);*/

  function SuiteAdder (projectname, gitpath, options) {
    this.projectname = projectname;
    this.gitpath = gitpath;
    this.name = Git.getRepoName(gitpath);
    this.project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', projectname, 'servers');
    this.target_path = Path.resolve(this.project_path, this.name);
    this.tmp_dir = Path.resolve(ALLEX_WORKSPACE_DIR, '.tmp', 'suites', projectname);
    this.success_string = "Git path "+gitpath+" successfully added to "+projectname;
    BaseWSWorkerClass.call(this, options);
  }
  Lib.inherit(SuiteAdder, BaseWSWorkerClass);

  SuiteAdder.prototype.destroy = function () {
    this.projectname = null;
    this.gitpath = null;
    if (this.tmp_dir && Fs.existsSync(this.tmp_dir)){
      Fs.removeSync(this.tmp_dir);
    }
    this.tmp_dir = null;
    this.target_path = null;
    this.project_path = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  SuiteAdder.prototype.go = function () {
    if (Fs.dirExists(this.target_path)) {
      if (this.options.force) {
        Node.warn(this.target_path, 'already exists, but will override due to --force option');
      }else{
        throw new Error(this.target_path+' already exists, cowardly retreating');
      }
    }



    if (!Fs.dirExists(this.project_path)){
      Fs.ensureDirSync(this.project_path);
    }

    Fs.recreateDir(this.tmp_dir);
    process.chdir(this.tmp_dir);
    Git.clone (this.gitpath).done(this.processClone.bind(this), this.exit.bind(this));
  };

  SuiteAdder.prototype.processClone = function (result) {
    if (Fs.existsSync(this.target_path)){
      if (this.options.force) {
        Node.warn ('Directory', this.target_path, 'already exists but will be deleted due to --force option');
        Fs.removeSync(this.target_path);
      }else{
        return this.exit(this.target_path, 'already exists cowardly retreating');
      }
    }
    Fs.renameSync (Path.resolve(this.tmp_dir, this.name) ,this.target_path);
    AllexJS.storeToAllexJS('serversuites', this.projectname+'/'+this.name, {
      git: this.gitpath,
      project: this.projectname,
      name : this.name
    });
    var scriptsPath = Path.resolve(this.project_path, '.scripts');
    if (Fs.existsSync(scriptsPath)){
      Fs.removeSync(scriptsPath);
    }

    Lib.runNext(this.destroy.bind(this));
    /*
     * will be left for tmux extension(s)
    GenerateScripts(Fs.readdirSync(this.project_path), this.project_path, this.projectname).done(
      this.destroy.bind(this),
      this.exit.bind(this)
    );
    */
  }

  return function (projectname, gitpath, options) {
    if (!projectname) return Q.reject('No project name');
    if (!gitpath) return Q.reject('No gitpath');
    var sd = new SuiteAdder(projectname, gitpath, options);
    return sd.defer.promise;
  };
}

module.exports = createCloneToSuite;


