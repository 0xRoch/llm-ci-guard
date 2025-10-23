#!/usr/bin/env node
const fs = require('fs');
const Module = require('module');
const path = require('path');

function run(filePath, args) {
  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, 'utf8');
  process.argv = [process.argv[0], absolutePath, ...args];

  const moduleInstance = new Module(absolutePath, module.parent);
  moduleInstance.filename = absolutePath;
  moduleInstance.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  moduleInstance._compile(code, absolutePath);
}

const [, , entryFile, ...rest] = process.argv;

if (!entryFile) {
  console.error('Usage: ts-node <file> [...args]');
  process.exit(1);
}

run(entryFile, rest);
