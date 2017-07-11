#!/bin/bash
. allex-shell-bsfl

function install_bower () {
  if [ ! -e 'bower.json' ];
  then
    echo 'Nothing to bower install do in '`pwd`', no bower.json file'
    return;
  fi

  local arr=("$@")
  local ROOT=`allex-bash-realpath "$BASH_SOURCE" ../scripts`
  local COMMAND="$ROOT/../scripts/bower_link.js ${arr[@]}"
  local POSTINSTALL="$ROOT/../scripts/bower_postinstall.js"
  local COMMANDR=`$COMMAND`;
  if [ -z "$COMMANDR" ]; then
    msg_success "bower components linking done, moving on ..."
  else
    msg_error "$COMMANDR"
    return 1
  fi
  if [ -f "bower_failed.json" ]; then
    rm bower_failed.json
  fi
  bower install -js --log-level=error "${arr[@]}" > bower_failed.json 2>&1
  if [ -s bower_failed.json ]
  then
    msg_error 'bower failed to install components, please review bower_failed.json'
    cat bower_failed.json
    return 1
  else
    if [ -f "bower_failed.json" ]
    then
      rm bower_failed.json
    fi
    msg_success 'bower has no complaints ...'
    return 0
  fi
}

# Install npm and bower components in a given directory
#
# arg1 = dir path suitable for a cd command
#
function install_npm_and_bower () {
  #todo: if no dir given, use current working dir ...
  #todo: try to work around some bower failures: link from cache whenever possible and do preinstall and postinstall scripts as well
  local DIR="$1"
  local OLD=`pwd`
  cd $DIR
  msg_notice "About to install bower and npm modules in $DIR"
  install_bower
  npm install && msg_success 'npm modules installed successfuly'
  cd $OLD
  return "$?"
}

function allex-goto-allexjs (){
  if [ ! -d $HOME/allexjs ]; then
    msg_error "No allexjs dir detected"
    return
  fi
  cd $HOME/allexjs
}

function allex-goto-project () {
  if [ -z $1 ]; then
    msg_error "No project given"
    return
  fi
  DIR=$HOME/allexjs/projects/$1
  if [ -d $DIR ]; then
    cd $DIR
  else
    msg_error "Unable to locate directory $DIR"
    return
  fi
}

