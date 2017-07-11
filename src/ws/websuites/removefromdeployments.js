'use strict';

function createRemoveFromDeployments (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q;

  function SuiteRemover (project, name, options) {
    this.project = project;
    this.name = name;

    if (!this.name) throw new Error('Undefined webapp suite name');
    if (!this.project) throw new Error('Undefined webapp project name');

    this.success_string = name+' was successfully removed from project '+this.project;
    this.project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', this.project, 'webdeployments', this.name);
    this.webapps_path = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', this.project, this.name);
    BaseWSWorkerClass.call(this, options);
  }

  Lib.inherit(SuiteRemover, BaseWSWorkerClass);
  SuiteRemover.prototype.destroy = function () {
    this.project_path = null;
    this.project = null;
    this.name = null;
    this.webapps_path = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  SuiteRemover.prototype.go = function () {
    if (!Fs.dirExists(this.project_path)) {
      throw new Error('Unable to find a given path: '+this.project_path);
    }
    if (!Git.isDirClear(this.project_path)) {
      if (this.options.force) 
      {
        Node.warn("There are some git pending issues ... Forcing delete due to --force option");
      }else{
        throw new Error('Directory not ready for deletion, pending git issues ... Review git status and try again');
      }
    }
    Fs.removeSync(this.project_path);
    Fs.removeSync(this.webapps_path);
    AllexJS.removeFromAllexJS('webdeployments', AllexJS.solutionKey(this.project, this.name));
    var webappdir = Path.dirname(this.webapps_path);
    if (!Fs.readdirSync(webappdir).length){
      Fs.removeSync(webappdir);
    }
    Lib.runNext(this.destroy.bind(this));
  };

  return function (project, name, options) {
    if (!project) return Q.reject('Project name missing');
    if (!name) return Q.reject('Solution name missing');

    var d = new SuiteRemover(project, name, options);
    return d.defer.promise;
  }
}

module.exports = createRemoveFromDeployments;


