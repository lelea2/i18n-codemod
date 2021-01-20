const { getParser } = require('codemod-cli').jscodeshift;
const { getOptions } = require('codemod-cli');
module.exports = function transformer(file, api) {
  const j = getParser(api);
  const root = j(file.source);
  const options = getOptions();
  const ALLOW_FUNC = [
    'onImpression',
    'onRender'
  ];

  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: {
        type: 'ThisExpression'
      },
      property: {
        type: 'Identifier',
        name: '_super'
      }
    }
  }).filter(nodePath => {
    const { node, parent } = nodePath;
    try {
      const functionName = parent.parentPath.parentPath.parentPath.value.key.name;
      return ALLOW_FUNC.includes(functionName);
    } catch(ex) {
      return false;
    }
  }).remove();

  return root.toSource({
    tabWidth: 2,
    useTabs: false,
    trailingComma: true,
    quote: 'single'
  });
};
