#!/usr/bin/env node

var lib = require('allexlib'),
  Atbower = require('allex_bowerhelperssdklib')(lib),
  args = process.argv.slice(2);

try {
  var all = Atbower.commands.link( args.length ? args : undefined);
  process.exit(all ? 0 : 1);
}catch (e) {
  process.exit();
}
