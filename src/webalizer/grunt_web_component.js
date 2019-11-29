var lib = require('allexlib'),
  Node = require('allex_nodehelpersserverruntimelib')(lib),
  Path = require('path'),
  Fs = Node.Fs;

function WebComponent (name) {
  this.name = name;
  this.config = null;
  this.js_files = [];
}

WebComponent.prototype.go = function () {
  if (!Fs.fileExists('./protoboard.json')) {
    Node.throwerror('No protoboard.json at '+process.cwd());
  }
  try {
    this.config = Fs.readJSONSync('./protoboard.json');
  }catch (e) {
    Node.throwerror('Unable to read protoboard.json due to '+e.message);
  }
};


WebComponent.prototype._processConcatTask = function(dest, source_list, js_list, tasks) {
  var ret = {
    src : source_list,
    dest: dest
  };
  Array.prototype.push.apply(js_list, source_list);
  return ret;
};

WebComponent.prototype.dumpJS = function (g) {
  var js = this.config.js;
  if (!g.concat) g.concat = {};
  if (!g.uglify) g.uglify = {};

  for (var i in js) {
    ///TODO: do check if task name ends with '.js' ...
    var fn = Path.join('dist',i+'.js');
    g.concat[i] = this._processConcatTask (fn, js[i], this.js_files);
    g.uglify[i] = {
      src : fn,
      dest: Path.join('dist/',i+'.min.js')
    };
  }
};

WebComponent.prototype.dumpCSS = function (g) {
  //TODO
};

function appendTaskName(prefix, name) {
  return prefix+':'+name;
}

WebComponent.prototype.dumpBrowserify = function (ret) {
  var b = this.config.browserify;
  if (!ret.browserify) ret.browserify = {dist:{files:{}}};
  var f = ret.browserify.dist.files;
  for (var i in b) {
    f[i] = b[i];
  }
};

WebComponent.prototype.dumpCompass = function (ret) {
  var c = this.config.compass;
  if (!ret.compass) ret.compass = {dist:{options:lib.extend({basePath:process.cwd()}, {cssDir:'dist'}, c)}};
};

WebComponent.prototype.dumpCopy = function (ret) {
  var c = this.config.copy;
  if (!ret.copy) {
    ret.copy = {dist:{files:c}};
  }
};

function doTrim (string) {return string ? string.trim() : string;}

WebComponent.prototype.dump = function () {
  if (!this.config) this.go();
  if (!this.config) Node.throwerror('Unable to load config, cowardly retreating ...');
  var ret = {}, c = this.config;
  var default_tasks = [];
  if (c.js) {
    this.dumpJS(ret);
    if (c.js) {
      var concat_keys = Object.keys(c.js);
      if (this.js_files.length) {
        ret.jshint = {
          'beforejsconcat' : this.js_files
          //'afterjsconcat': c.js.concat ? concat_keys : null
        };
        if (c.exclude && c.exclude.jshint) {
          ret.jshint.options = {
            ignores: c.exclude.jshint
          };
          if (Fs.fileExists('.jshintignore')) {
            var d = Fs.readFileSync('.jshintignore', {encoding:'utf8'});
            if (d) {
              Array.prototype.push.apply(ret.jshint.options.ignores, d.split("\n").map(doTrim));
            }
          }
        }
        default_tasks.push('jshint:beforejsconcat');
        Array.prototype.push.apply(default_tasks, concat_keys.map(appendTaskName.bind(null, 'concat')));
        /*
        will this fail on browserify? reconsider it ...
        if (ret.jshint.afterjsconcat) {
          default_tasks.push ('jshint:afterjsconcat');
        }
        */
        Array.prototype.push.apply(default_tasks, concat_keys.map(appendTaskName.bind(null, 'uglify')));
      }
    }
  }

  if (c.css) this.dumpCSS(ret);
  if (c.browserify) {
    this.dumpBrowserify(ret);
    default_tasks.unshift('browserify');
  }
  if (c.compass) {
    this.dumpCompass(ret);
    default_tasks.unshift('compass');
  }
  /*
  if (c.copy) {
    this.dumpCopy(ret);
    default_tasks.unshift('copy');
  }
  */

  if (ret.concat) {
    if (!ret.concat.options) ret.concat.options = {};
    ///TODO: kako da se dohvatim necega sto lici na ovo : current_file_name
  }
  return {
    grunt_config : ret,
    tasks: {
      'default': default_tasks
    }
  }
};

function npm_install () {
  return (Fs.fileExists(Path.resolve (process.cwd(), 'package.json'))) ? Node.executeCommand ('npm install', null, null, true) : lib.q.resolve('ok');
}

function do_grunt (grunt) {
  try {
    var comp = new WebComponent(Path.basename(process.cwd())),
    data = comp.dump();
    //console.log(JSON.stringify(data, null, 2));
    grunt.initConfig(data.grunt_config);
    for (var i in data.tasks) {
      grunt.registerTask(i, data.tasks[i]);
    }
  }catch (e) {
    if (e.stack) console.log(e.stack);
    grunt.fail.fatal(e.message);
  }
}

module.exports = {
  grunt:do_grunt,
  GruntTasks : [
    'grunt-contrib-copy',
    'grunt-contrib-concat',
    'grunt-contrib-compass',
    'hers-grunt-contrib-uglify',
    'grunt-contrib-jshint',
    'grunt-browserify'
  ],
  tasklist:['default']
};
