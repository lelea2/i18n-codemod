const { getParser } = require('codemod-cli').jscodeshift;

module.exports = function transformer(file, api) {
  const j = getParser(api);
  const root = j(file.source);

  root.find(j.CallExpression, {
    callee: {
      property: {
        name: 'lookupTranslation',
      },
    }
  }).replaceWith(nodePath => {
    const { node } = nodePath;
    console.log(node);
  });
}