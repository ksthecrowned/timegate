// Learn more https://docs.expo.io/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const tsconfig = require(path.join(projectRoot, 'tsconfig.json'));

// Build a flat alias map from tsconfig paths. We support the common case
// of a single glob target, e.g. "@/*": ["./*"].
const aliasMap = {};
for (const [alias, value] of Object.entries(tsconfig.compilerOptions.paths || {})) {
  const targets = Array.isArray(value) ? value : [value];
  if (alias.endsWith('/*') && targets.length === 1 && targets[0].endsWith('/*')) {
    const aliasPrefix = alias.slice(0, -2);
    const targetPrefix = path.resolve(projectRoot, targets[0].slice(0, -2));
    aliasMap[aliasPrefix] = targetPrefix;
  } else if (!alias.endsWith('*')) {
    const target = path.resolve(projectRoot, targets[0]);
    aliasMap[alias] = target;
  }
}

const config = getDefaultConfig(projectRoot);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [alias, target] of Object.entries(aliasMap)) {
    if (moduleName === alias) {
      return context.resolveRequest(context, target, platform);
    }
    if (moduleName.startsWith(alias + '/')) {
      const subPath = moduleName.slice(alias.length + 1);
      return context.resolveRequest(context, path.join(target, subPath), platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
