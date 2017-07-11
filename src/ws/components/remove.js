'use strict';

function createRemove (lib, Node) {
  'use strict';
  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    Git = require('allex_githelperssdklib')(lib),
    Bower = require('allex_bowerhelperssdklib')(lib);

  function Remover(name, options) {
    if (!name) throw new Error('Unable to remove without name');
    var allex_record = AllexJS.readFromAllexJS ('components', name);

    if (!allex_record) {
      throw new Error('There is no component named '+name);
    }
    this.project = allex_record.project || null;
    this.name = name;

    this.options = options;
    this.path = Path.resolve(ALLEX_WORKSPACE_DIR, (this.project ? Path.join('projects', this.project) : './'),'components', this.name);
    this.remove();
  }

  Remover.prototype.destroy = function () {
    this.project = null;
    this.name = null;
    this.options = null;
  };

  Remover.prototype.exit = function () {
    this.destroy();
    Node.exit.apply(Node, arguments);
  };

  Remover.prototype.remove = function () {
    if (!this.name) {
      this.exit('Component name not provided');
      return;
    }
    //maybe check if this.name is registered in allexjs.json
    try {
      if (!Git.isDirClear(this.path)) {
        if (this.options.force){
          Node.warn('There are some git pending issues ... Forcing delete due to --force option');
        }else{
          this.exit('Directory not ready for deletion, pending git issues ... Review git status and try again');
          return;
        }
      }
      Bower.commands.unlink(this.name);
      Node.info('Bower unlinked', this.name);
      Fs.removeSync(this.path);
      Node.info('Removed directory', this.path);
      AllexJS.removeFromAllexJS('components', this.name);
      Node.info('Successfully done');
      Bower.commands.unlink(this.name);
      this.destroy();
    }catch (e) {
      console.log(e.stack);
      this.exit(e.toString());
    }

  };

  return function (name, options) {
    new Remover(name, options);
  };
}

module.exports = createRemove;
