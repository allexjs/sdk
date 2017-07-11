'use strict';

function createRemoveFromSuite (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    recognize = Lib.moduleRecognition,
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    Lib = require('allexlib'),
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q;

  function SuiteRemover (name, options) {
    this.outerprojectname = name;
    this.projectname = null;
    this.name = null;
    this.success_string = null;
    this.project_path = null;
    this.webapps_path = null;
    this.path = null;

    BaseWSWorkerClass.call(this, options);
  }

  Lib.inherit(SuiteRemover, BaseWSWorkerClass);
  SuiteRemover.prototype.destroy = function () {
    this.project_path = null;
    this.projectname = null;
    this.name = null;
    this.webapps_path = null;
    this.outerprojectname = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  SuiteRemover.prototype.go = function () {
    var name = this.outerprojectname;
    this.outerprojectname = null;
    if (name) {
      recognize(name).then(this.onRecognized.bind(this, name));
    }
  };
  SuiteRemover.prototype.onRecognized = function (name, recognized) {
    if (Lib.isString(recognized)) {
      var t = name.split('/');
      this.projectname = t[0];
      this.name = t[1];
    } else if (recognized && 'object' === typeof recognized) {
      this.projectname = recognized.namespace;
      this.name = recognized.servicename;
    }

    if (!this.name) {
      this.exit(new Error('Undefined webapp suite name'));
      return;
    }
    if (!this.projectname) {
      this.exit(new Error('Undefined webapp project name'));
      return;
    }

    this.success_string = name+' was successfully removed from project '+this.projectname;
    this.project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', this.projectname, 'websolutions');
    this.webapps_path = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', this.projectname, this.name);
    this.path = Path.resolve(this.project_path, this.name);
    this.reallyGo();
  };
  SuiteRemover.prototype.reallyGo = function () {
    if (!Fs.dirExists(this.path)) {
      this.exit(new Error('Unable to find a given path: '+this.path));
      return;
    }
    if (!Git.isDirClear(this.path)) {
      if (this.options.force) 
      {
        Node.warn("There are some git pending issues ... Forceing delete due to --force option");
      }else{
        this.exit(new Error('Directory not ready for deletion, pending git issues ... Review git status and try again'));
        return;
      }
    }
    Fs.removeSync(this.path);
    Fs.removeSync(this.webapps_path);
    AllexJS.removeFromAllexJS('websolutions', AllexJS.solutionKey(this.projectname, this.name));

    var remaining = Fs.readdirSync(this.project_path);

    if (!remaining.length) {
      Fs.removeSync(this.project_path);
    }

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
  };
}

module.exports = createRemoveFromSuite;

