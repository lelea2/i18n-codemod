const { getParser } = require('codemod-cli').jscodeshift;
const convertToTemplateString = require('../../helpers/convertToTemplateString');

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
    const args = node.arguments;
    let newArgs = null;
    if (args && args.length === 3) {
      const firstArgs = args[0].value;
      if (firstArgs === 'component') {
        const secondAgrs = args[1].value;
        if (typeof secondAgrs === 'string') {
          newArgs = [
            j.literal('components/' + secondAgrs),
            args[2]
          ];
        } else {
          newArgs = [
            j.binaryExpression(
              '+',
              j.literal('components/'),
              args[1]
             ),
            args[2]
          ];
        }
      } else if (firstArgs === 'template') {
        newArgs = [args[1], args[2]];
      }
    } else {
      newArgs = args;
    }
    node.arguments = newArgs;
    return node;
  });

  // convert to string
  root.find(j.BinaryExpression, { operator: '+' })
      .replaceWith(p => convertToTemplateString(j, p));

  return root.toSource({
    tabWidth: 2,
    useTabs: false,
    trailingComma: true,
    quote: 'single'
  });
}