var REFERENCES = require('../../templates/webapps/predefined_references.json');

function createPBWebAppReader (Lib, Node) {
  'use strict';

  var Bower = require('allex_bowerhelperssdklib')(Lib),
    Fs = Node.Fs,
    Allex = require('allex_allexjshelperssdklib')(Lib),
    Path = Node.Path,
    Q = Lib.q,
    QLib = Lib.qlib;

  function PBWebAppReader (dir, options, starteddefer) {
    if (!starteddefer) {
      throw new Error('PBWebAppReader must get a starteddefer in ctor');
    }
    if (!options) options = {};
    this.cwd = Path.resolve(dir);
    var pb_path = Path.join(this.cwd, 'protoboard.json');
    if (!Fs.fileExists(pb_path)) return this.error('No file: "protoboard.json" in '+this.cwd);
    this.pb_data = Fs.safeReadJSONFileSync(pb_path);
    this._references = Lib.extend({}, REFERENCES, this.pb_data.references);
    if (!this.pb_data) this.pb_data = {};
    if (!this.pb_data.partials) this.pb_data.partials = {};
    if (!this.pb_data) return this.error('No protoboard data in file: '+pb_path);
    if (!this.pb_data.protoboard && this.pb_data.protoboard.role !== 'web_app') return this.error('Invalid protoboard content at '+this.cwd);

    this.requires_connection = this.pb_data.protoboard.requires_connection;
    this.devel = ('devel' in  options) ? options.devel : true;
    this.distro = ('distro' in options) ? options.distro : null;
    var includes = [];

    if (this.devel) {
      includes.push(Bower.native.config.storage.links);
    }

    var cwdbower = Path.resolve(dir,'bower_components');
    var cwdbower_rc = Path.resolve(dir, '.bowerrc');

    if (Fs.fileExists(cwdbower_rc)) {
      var td = Fs.readFieldFromJSONFile(cwdbower_rc, 'directory');
      if (td) cwdbower = td;
    }

    this.components_dir = cwdbower;
    includes.push(cwdbower);

    if (options.includes){
      if (Lib.isStrng(options.includes)) includes.push(options.includes);
      if (Lib.isArray(options.includes)) Array.prototype.push.apply(includes, options.includes);
    }
    this.includes = includes.map(transformIncludePath.bind(null, this, this.cwd));
    this.components = {};
    this.pages = {};
    this.partials = [];
    this.jstemplates = {};

    var promises = [];
    Lib.traverse(this.pb_data.pages, this._prepare_page.bind(this, promises));
    QLib.promise2defer(Q.all(promises).then(
      this.buildNamespace.bind(this)
    ).then(
      this.searchComponents.bind(this)
    ).then(
      QLib.returner(this)
    ), starteddefer);
  }


  PBWebAppReader.prototype.destroy = function () {
    this._references = null;
    this.components_dir = null;
    Lib.objNullAll(this.jstemplates);
    this.jstemplates = null;

    Lib.objNullAll(this.partials);
    this.partials = null;

    Lib.objNullAll(this.pages);
    this.pages = null;

    Lib.objNullAll(this.components);
    this.components = null;

    Lib.arryNullAll(this.includes);
    this.includes = null;

    this.devel = null;
    this.requires_connection = null;
    this.cwd = null;
    this.defer = null;
    this.distro = null;
  };

  PBWebAppReader.prototype.getSafeDistro = function () {
    return this.distro ? this.distro : (this.devel ? 'devel' : 'production');
  };

  PBWebAppReader.prototype.getDefaultConnection = function () {
    var version = this.devel ? 'devel' : 'production';
    if (this.pb_data.protoboard && this.pb_data.protoboard.default_connections && this.pb_data.protoboard.default_connections[version]){
      return this.pb_data.protoboard.default_connections[version];
    }else{
      return this.devel ? './connections/local' : './connections/public';
    }
  };

  function absolutizePath(root, path) {
    return Path.isAbsolute(path) ? path : Path.resolve(root, path);
  }

  function transformIncludePath(pbw, root, path) {
    if (!path) return pbw.error('Invalid path ...'+path);
    var ret = absolutizePath(root, path);
    if (!Lib.isString(ret)) return pbw.error('Invalid includes path '+ret);
    return ret;
  };

  PBWebAppReader.prototype.connectionDataTemplateTarget = function () {
    return Path.resolve(this.cwd, 'js', '_connection.js');
  };

  PBWebAppReader.prototype.set_connection_data = function (connection_data) {
    if (this.connection_data) return this.error('Connection data already set ...');
    ////TODO: what to do with this ?!?!?!
    //if (!this.requires_connection) return this.error('Connection data was never required');

    this._prepareJSTemplate({
      dest_path: this.connectionDataTemplateTarget(),
      src_path: Path.resolve(__dirname, '../../templates/connection.js'),
      data: {'connection':JSON.stringify(connection_data)}
    });
  };

  PBWebAppReader.prototype.isConnectionDataSet = function () {
      return this.jstemplates[this.connectionDataTemplateTarget()];
  };

  PBWebAppReader.prototype._prepareJSTemplate = function (rec) {
    this.jstemplates[rec.dest_path] = rec;
  };

  PBWebAppReader.prototype._preparelocalPartials = function () {
    this._iteratePartialsSubDir(null, 'partials');
  };

  PBWebAppReader.prototype._iteratePartialsSubDir = function (cwd, path) {
    var content = {
      files: [],
      dirs: []
    };
    if (cwd) {
      path = Path.join(cwd, path);
    }

    var root = Path.resolve(this.cwd, path);
    if (Fs.dirExists(root)) Fs.readdirSync(root).forEach(diversify.bind(null, content, root));
    if (content.files.length) {
      this.pb_data.partials[path] = content.files;
    }
    if (content.dirs.length) {
      content.dirs.forEach(this._iteratePartialsSubDir.bind(this, path));
    }
  }

  function diversify (content, root, item) {
    var stat = Fs.lstatSync(Path.resolve(root, item));
    if (stat.isSymbolicLink()){
      ///will ignore symbolic links ...
      return;
    }
    if (stat.isFile()) content.files.push(item);
    if (stat.isDirectory()) content.dirs.push(item);
  };

  PBWebAppReader.prototype._prepare_partials = function (record, root){
    var component_name = extractComponentName(root);
    if (component_name) this._requireComponent(component_name);
    if (Lib.isArray(record)) {
      Array.prototype.push.apply(this.partials,record.map(this._preparePartialsRecord.bind(this, root, component_name)));
    }
  };

  PBWebAppReader.prototype._preparePartialsRecord = function (root, component_name, rec) {
    var src = Path.join(root, rec);
    var ret = {
      component: component_name,
      resolved: false,
      src_path: component_name ? replaceComponentSource(component_name, src) : Path.resolve(this.cwd, src),
      dest_path:component_name ? src.replace(COMPONENTS_START, 'partials/') : Path.resolve(this.cwd, '_generated', src)
    };
    return ret;
  };

  function findhash (item, index) {
    if (Lib.isString(item) && item.charAt(0) === '#') return index;
  }

  function replacePage (name, item) {
    if (!Lib.isString(item)) return item;
    return item.replace('PAGE', name);
  }

  PBWebAppReader.prototype.resolveReferences = function (list, page) {
    try {
    var references_list = [];
    while (true) {
      var index = Lib.traverseConditionally(list, findhash);
      if (Lib.isUndef(index)) {
        break;
      }
      var ref = list[index];
      if (references_list.indexOf(ref) > -1) {
        throw new Error("Circular dependency detected: "+ref);
      }
      if (!this._references[ref]) throw new Error('Missing reference '+ref);
      var args = [index, 1].concat(this._references[ref]);
      Array.prototype.splice.apply(list, args);
    }
    if (!list) return [];

    var ret = list.map(replacePage.bind(null, page));
    }catch (e) {
      console.log(e, e.stack);
    }
    return ret;
  };

  PBWebAppReader.prototype._prepare_page = function (promises, p_data, name){
    promises.push(this._do_page_preparation(p_data, name));
  };

  PBWebAppReader.prototype._do_page_preparation = function (p_data, name) {
    if (this.pages[name]) return Q.reject(new Error('Duplicate page declaration '+name));
    return Q.all([
      Q.all(this.resolveReferences(p_data.js, name).map(this._prepareAsset.bind(this, 'js'))),
      Q.all(this.resolveReferences(p_data.css, name).map(this._prepareAsset.bind(this, 'css')))
    ]).then(this.onJSCSS.bind(this, p_data, name));
  };

  PBWebAppReader.prototype.onJSCSS = function (p_data, name, jscss) {
    var js = jscss[0], css = jscss[1];
    if (!Lib.isArray(js)) {
      console.error('no js', jscss);
      process.exit(1);
    }
    if (!Lib.isArray(css)) {
      console.error('no css', jscss);
      process.exit(1);
    }
    this.pages[name] = {
      'connection' : false,
      'js': js,
      'css': css,
      'vars': p_data.vars,
      'distro_vars' : p_data.distro_vars,
      'include_manifest_devel' : p_data.include_manifest_devel,
    };


    if ( this.requires_connection ) {
      this.pages[name].connection = 'connection' in p_data && !p_data.connection ? false : true;
    }

    if (this.pages[name].connection) {
      return this._prepareSourceLessAsset('js','_connection.js').then(
        this.onSourceLessAsset.bind(this)
      );
    }
    return Q(true);
  };

  PBWebAppReader.prototype.onSourceLessAsset = function (asset) {
    this.pages[name].js.unshift(asset);
    return Q(true);
  };

  var COMPONENTS_START = /^components\//,
    ALLEX_START = /^allex:/;

  function replaceComponentSource (name, src) {
    return src.replace(Path.join('components', name)+Path.sep, '');
  };

  function extractComponentName (path) {
    var ret = null, temp = null;
    if (path.match(COMPONENTS_START)) {
      temp = path.split('/');
      ret = temp[1];
      if (!ret) return this.error('Components record must have component name '+path);
    }
    return ret;
  }

  PBWebAppReader.prototype._prepareSourceLessAsset = function (root_if_no_component, record) {
    var ret = this._prepareAsset(root_if_no_component, record);
    return ret;
  };

  PBWebAppReader.prototype._prepareAsset = function (root_if_no_component, record) {
    var ret = {
      component:null,
      src_path:null,
      dest_path:null,
      resolved: false
    },
      alternative = null,temp = null;

    if (!Lib.isString(record)) {
      //basepath field: path
      //production field: minified path
      //devel field: devel path
      //conditional field: conditional tag
      //distro field : choices for different build distro

      if (!record.basepath) {
        record.basepath = './';
      }

      if (!record.production) record.production = record.devel;
      alternative = this.devel ? record.devel : record.production;

      if (record.distro) {
        if (this.distro in record.distro) {
          var rdd = record.distro[this.distro];
          if (Lib.isString(rdd)){
            alternative = rdd;
          }else{
            if (!rdd.devel) {
              return Q.reject(new Error ('No devel distro asset in record: '+JSON.stringify(rdd)));
            }
            if (!rdd.production) rdd.production = rdd.devel;

            alternative = this.devel ? rdd.devel : rdd.production;
          }
        }
     }
      if (!alternative) return this.error('Record invalid:'+JSON.stringify(record, null, 2));
      ret.dest_path = Path.join(root_if_no_component, record.basepath, alternative);
      ret.src_path = this.devel ? Path.join(root_if_no_component, ret.dest_path) : absolutizePath (this.cwd, ret.dest_path);
      ret.conditional = record.conditional;

      return Q(ret);
    }else{
      if (record.match(ALLEX_START)) {
        return this.getAllexSrcPath(record).then(this.onSrcPathForPrepareAsset.bind(this, root_if_no_component, ret));
      }else{
        return this.onSrcPathForPrepareAsset(root_if_no_component, ret, record);
      }
    }
  };

  PBWebAppReader.prototype.onSrcPathForPrepareAsset = function (root_if_no_component, ret, src_path) {
    ret.src_path = src_path;
    ret.dest_path = ret.src_path;
    ret.component = extractComponentName(ret.src_path);

    if (ret.component) {
      this._requireComponent(ret.component);
      ret.src_path = ret.src_path.replace(Path.join('components', ret.component)+Path.sep,'');
    }else{
      var is_public = Lib.traverseConditionally (this.pb_data.public_dirs,isPublicAsset.bind(null, ret.src_path));

      if (ret.src_path.match (/(\:\/\/)/)) throw new Error('Global links now allowed: '+ret.src_path);

      ret.src_path = Path.resolve(this.cwd, is_public ? './' : root_if_no_component, ret.src_path);
      ret.dest_path= Path.join(is_public ? './' : root_if_no_component, ret.dest_path);
      ret.resolved = true;
    }
    return Q(ret);
  };

  function isPublicAsset (ret, public_dir) {
    if (ret.match (new RegExp('^'+public_dir+'\/'))) {
      return true;
    }
  }

  PBWebAppReader.prototype.getAllexSrcPath = function (record) {
    //ok get allex identifier rest of it is path ...
    var spl1 = record.split('/'),
      component = Lib.moduleRecognition(spl1.shift());
    return component.then(onRecognized.bind(null, spl1));
  };

  function onRecognized (spl1, component) {
    if (!component) return Q(null);
    if (Lib.isString(component)) {
      return Q('components/'+component+'/'+(spl1.length ? spl1.join('/') : 'dist/browserified.js'));
    }
    return Q('components/'+component.modulename+'/'+(spl1.length ? spl1.join('/') : 'dist/browserified.js'));
  };

  PBWebAppReader.prototype._requireComponent = function (name) {
    if (this.components[name]) return this.components[name];
    this.components[name] = null;
    return null;
  };

  PBWebAppReader.prototype.buildNamespace = function () {
    var nsfile;
    try {
      nsfile = Fs.readJSONSync(Path.join(Node.getNamespacePath(), '.allexns.json'));
      Fs.ensureDirSync(Path.join(this.components_dir, 'allexns'));
      Fs.writeFileSync(Path.join(this.components_dir, 'allexns', 'ns.js'), "window['.allexns.js'] = "+JSON.stringify(nsfile, null, 2)+";\n");
    } catch (e) {
      return Q.reject(new Error('Cannot read .allexns.json: '+e.message));
    }
    return Q(true);
  };

  PBWebAppReader.prototype.searchComponents = function () {
    var bower_path = Path.resolve(this.cwd, 'bower.json'),
      deps = null;
    if (Fs.fileExists(bower_path)){
      deps = Fs.readFieldFromJSONFile(bower_path, 'dependencies');
    }

    if (deps) {
      for (var i in deps) {
        if (!this.components[i]) this.components[i] = null;
      }
    }

    Lib.traverseConditionally (this.includes, this._searchComponents.bind(this));
    return Q.all(this.getUnresolvedComponents().map (this.resolveAllexComponents.bind(this)));
  };

  PBWebAppReader.prototype.resolveAllexComponents = function (name) {
    var p = Allex.paths.allexServiceWebC(name); ///global one ...,
    if (Fs.dirExists(p)) {
      this.storeComponent(name, p);
      return Q.resolve(true);
    }

    return Allex.paths.allexServiceWebC(name, this.cwd).then (this._checkAllexComponentExists.bind(this, name));
  };

  PBWebAppReader.prototype._checkAllexComponentExists = function (name, p) {
    if (Fs.dirExists(p)) {
      this.storeComponent(name, p);
    }
    return Q.resolve (true);
  };

  PBWebAppReader.prototype._searchComponents = function (dir){
    var unresolved = this.getUnresolvedComponents().length,
      bower_fp = Path.resolve(this.cwd, dir, 'bower.json'),
      pb_fp = Path.resolve(this.cwd, dir, 'protoboard.json');

    if (Fs.fileExists(pb_fp) && Fs.fileExists(bower_fp)){
      ///this is exact component dir ...
      var name = Fs.readFieldFromJSONFile(bower_fp, 'name');
      if (!this.components[name]){
        this.storeComponent(name, Path.resolve(this.cwd, dir));
      }
      return;
    }else{
      var resolved = [];
      if (!Fs.dirExists(dir)) return;
      Fs.readdirSync(dir).forEach(isComponentSuitable.bind(null, this, dir));
    }

    return this.getUnresolvedComponents().length ? undefined : true;
  };

  PBWebAppReader.prototype.storeComponent = function (name, path) {
    if (this.components[name]) throw new Error('Already loaded component '+name);
    var ret = {
      name: name,
      path:path,
      public_dirs: null
    };
    if (!Fs.dirExists(path) ) throw new Error('Unable to locate directory: '+path);
    this.components[name] = ret;
    var pbf = Path.join(path, 'protoboard.json');
    if (!Fs.fileExists(pbf)) return; //nothing to be done
    var pb = Fs.readFieldFromJSONFile(pbf);
    ret.public_dirs = pb && pb.protoboard && pb.protoboard.public_dirs ? pb.protoboard.public_dirs : null;
    if (pb.partials) {
      Lib.traverse(pb.partials, expandPBPartialsRecordWithComponentPartials.bind(null, this.pb_data.partials, name));
    }
    ret.protoboard = true;
  };

  function expandPBPartialsRecordWithComponentPartials (pbdata, component_name, partials, root) {
    var nr = Path.join('components', component_name, root);
    if (pbdata[nr]) return; //won't affect webapp partials data ....
    pbdata[nr] = partials;
  }

  function isComponentSuitable (pbw, root, dir){
    var fp = absolutizePath(root, dir);
    if (!Fs.dirExists(fp)) return;
    var name = Path.basename(fp), 
      bower = Path.resolve(fp, 'bower.json');
    if (Fs.fileExists(bower)) name = Fs.readFieldFromJSONFile(bower, 'name');

    if (pbw.components[name]) return;
    if (pbw.getUnresolvedComponents().indexOf(name) < 0) return;
    pbw.storeComponent(name, fp);

  }

  PBWebAppReader.prototype.getUnresolvedComponents = function () {
    var ret = [];
    for (var i in this.components) {
      if (this.components[i] === null) ret.push(i);
    }
    return ret;
  };

  PBWebAppReader.prototype.error = function (str){
    throw new Error(str);
  };

  PBWebAppReader.prototype.resolveAssets = function () {
    var l  = this.getUnresolvedComponents().length;
    if (l) return this.error('Unable to resolve assets untill all components are ready ...');
    Lib.traverse(this.pages, this._resolvePage.bind(this));
    this.partials.forEach(this._resolveAsset.bind(this));
  };

  PBWebAppReader.prototype._resolvePage = function (page_data, name){
    page_data.js.forEach(this._resolveAsset.bind(this));
    page_data.css.forEach(this._resolveAsset.bind(this));
  };

  PBWebAppReader.prototype._resolveAsset = function (rec) {
    //console.log(JSON.stringify(rec));
    if (rec.resolved || !rec.component) {
      return; ///nothing to be done: either resolved eithec component igonrant ...
    }
    var component = this.components[rec.component];
    if (!component) return; /// component not resolved yet ...

    rec.resolved = true;
    rec.src_path = Path.resolve(this.cwd, component.path, rec.src_path);
  };

  PBWebAppReader.prototype.finalize = function () {
    if (!this.isReady()) throw new Error('Unable to finalize since I am not as ready as you might think...');

    this._preparelocalPartials();
    Lib.traverse(this.pb_data.partials, this._prepare_partials.bind(this));
    this.resolveAssets();
  };

  PBWebAppReader.prototype.isReady = function () {
    var len = this.getUnresolvedComponents().length;
    var ret = (this.requires_connection ? len === 0 && this.isConnectionDataSet() : len === 0);
    if (ret) return !!ret;
    Node.error('Unresolved components '+len+' ('+this.getUnresolvedComponents().join(',')+')',', connection set: ',!!this.isConnectionDataSet());
  };

  PBWebAppReader.prototype.getProtoboards = function () {
    var ret = [];
    Lib.traverse(this.components, isProtoboard.bind(null, ret));
    return ret;
  };

  PBWebAppReader.prototype.doneWithModules = function () {
    var len = this.getUnresolvedComponents().length;
    if (!len) {
      //nothing to be done _fireIfReady will do needed ...
      return;
    }
  };

  function isProtoboard (ret, rec) {
    if (rec.protoboard) ret.push (rec);
  };

  return PBWebAppReader;
}

module.exports = createPBWebAppReader;

