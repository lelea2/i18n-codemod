const { getParser } = require('codemod-cli').jscodeshift;
const { getOptions } = require('codemod-cli');
const { hasRequireOrImport } = require('../../helpers/check-import');

module.exports = function transformer(file, api) {
  const j = getParser(api);
  const root = j(file.source);
  const options = getOptions();
  const importMixin =
    root.find(j.ImportDeclaration)
        .filter(nodepath => nodepath.value.source.value === 'organization-base/mixins/tracking/module-tracking');
  // console.log(importMixin.length);
  const shouldMigrate = importMixin.length === 1;
  // remove mixin import
  importMixin.remove();
  if (shouldMigrate) {
    // Prepare for import
    const importLength = root.find(j.ImportDeclaration).length;
    if (!hasRequireOrImport(j, root, '@ember/service')) {
      root.find(j.ImportDeclaration).at(importLength - 1).get()
        .insertBefore(
          `import { inject as service } from '@ember/service';`
        );
    }
    if (!hasRequireOrImport(j, root, 'ember-cli-pemberly-tracking/utils/tracking')) {
      root.find(j.ImportDeclaration).at(importLength - 1).get()
        .insertBefore(
          `import { generateTrackingId } from 'ember-cli-pemberly-tracking/utils/tracking';`
        );
    }
    // SKIP: will skip adding object in import in this  case
    if (!hasRequireOrImport(j, root, '@ember/object')) {
      root.find(j.ImportDeclaration).at(importLength - 1).get()
        .insertBefore(
          `import { set, get, getProperties } from '@ember/object';`
        );
    }
    const mixinIdentifier = root.find(j.Identifier, {
      name: 'ModuleTrackingMixin'
    });
    // remove ModuleTrackingMixin
    mixinIdentifier.remove();
    // Prepare shorthanded value
    const prepareShortHandVar = (value) => {
      const node = j.property('init', j.identifier(value), j.identifier(value));
      node.shorthand = true;
      return node;
    };
    const generateTrackingId = j.expressionStatement(
      j.identifier(`set(this, 'trackingId', generateTrackingId())`)
    );
    generateTrackingId.comments = [];
    generateTrackingId.comments.push(
      j.commentBlock('*\n * @property {String} trackingId represents the lifetime/instance of a page module\n ', true, true)
    );
    // Flag to include init if needed
    let includeInit = true;
    // Finding init already exists
    root.find(j.ObjectMethod, {
      key: {
        name: 'init'
      }
    }).replaceWith(nodePath => {
      const { node }  = nodePath;
      // console.log(node.body.body.length);
      node.body = j.blockStatement([
        ...node.body.body,
        generateTrackingId,
        j.expressionStatement(
          j.identifier(`get(this, 'moduleTracking').setupTracking(this)`),
        )
      ]);
      node.comments = [];
      node.comments.push(
        j.commentBlock('*\n * @override\n ', true, true)
      );
      includeInit = false;
      return node;
    });

    // Changing format for this.fireCustomActionEvent
    root.find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'ThisExpression',
        },
        property: {
          name: 'fireCustomActionEvent',
        },
      }
    }).replaceWith(nodePath => {
      const { node } = nodePath;
      const argumentsArr = node.arguments;
      const argument0 = argumentsArr[0]; // originally controlUrn
      const restArguments = argumentsArr.slice(1) || []; // the rest of arguments array
      // reset nodeArgument
      node.arguments = [
        j.identifier(`get(this, 'moduleName')`),
        argument0,
        j.identifier(`get(this, 'trackingId')`),
      ].concat(restArguments);
      return node;
    });
    // replace function name call
    root.find(j.MemberExpression, {
      object: {
        type: 'ThisExpression',
      },
      property: {
        name: 'fireCustomActionEvent',
      },
    }).replaceWith(nodePath => {
      const { node } = nodePath;
      node.object.type = 'CallExpression';
      node.object = j.callExpression(
        j.identifier('get'),
        [
          j.thisExpression(),
          j.literal('moduleTracking')
        ]
      );
      return node;
    });
    
    // This works here since we only have 1 ObjectExpression in this format js
    // console.log(root.find(j.ObjectExpression).length);
    root.find(j.ObjectExpression)
      .filter(p => {
        // console.log(p.parentPath.node.callee.object.name);
        return p.parentPath.node && p.parentPath.node.type === 'CallExpression' && p.parentPath.node.callee.object &&
          (p.parentPath.node.callee.object.name === 'Component' || p.parentPath.node.callee.object.name === 'ArtdecoEmptyState');
      })
      .replaceWith(nodePath => {
        const { node } = nodePath;
        const trackingService = j.property(
          'init',
          j.identifier('moduleTracking'),
          j.identifier("service('organization-custom-tracking@module-tracking')")
        );
        let onInit = null;
        if (includeInit) {
          onInit = j.property(
            'init',
            j.identifier('init'),
            j.functionExpression(
              null,
              [],
              j.blockStatement([
                j.expressionStatement(
                  j.identifier('this._super(...arguments)')
                ),
                generateTrackingId,
                j.expressionStatement(
                  j.identifier(`get(this, 'moduleTracking').setupTracking(this)`),
                )
              ])
            )
          );
          // we could also use ObjectMethod to define here
          onInit.comments = [];
          onInit.comments.push(
            j.commentBlock('*\n * @override \n ', true, true)
          );
          onInit.method = true;
        }
        const onRender = j.property(
          'init',
          j.identifier('onRender'),
          j.functionExpression(
            null,
            [],
            j.blockStatement([
              j.expressionStatement(
                j.identifier('this._super(...arguments)')
              ),
              j.variableDeclaration('const',
                [j.variableDeclarator(
                  j.objectPattern(
                    [
                      prepareShortHandVar('trackingId'),
                      prepareShortHandVar('moduleName'),
                    ],
                  ),
                  j.callExpression(
                    j.identifier('getProperties'),
                    [
                      j.thisExpression(),
                      j.literal('trackingId'),
                      j.literal('moduleName')
                    ]
                  )
                )]
              ),
              j.expressionStatement(
                j.identifier(`get(this, 'moduleTracking').fireCustomView(moduleName, trackingId)`)
              )
            ])
          )
        );
        onRender.comments = [];
        onRender.comments.push(
          j.commentBlock('*\n * Fire custom view event when module is rendered \n * @override\n ', true, true)
        );
        onRender.method = true;
        const onImpression = j.property(
          'init',
          j.identifier('onImpression'),
          j.functionExpression(
            null,
            [
              j.identifier('metadata')
            ],
            j.blockStatement([
              j.expressionStatement(
                j.identifier('this._super(...arguments)')
              ),
              j.variableDeclaration('const',
                [j.variableDeclarator(
                  j.objectPattern(
                    [
                      prepareShortHandVar('trackingId'),
                      prepareShortHandVar('moduleName'),
                      prepareShortHandVar('element'),
                    ],
                  ),
                  j.callExpression(
                    j.identifier('getProperties'),
                    [
                      j.thisExpression(),
                      j.literal('trackingId'),
                      j.literal('moduleName'),
                      j.literal('element')
                    ]
                  )
                )]
              ),
              j.expressionStatement(
                j.callExpression(
                  j.identifier(`get(this, 'moduleTracking').fireCustomImpression`),
                  [
                    j.identifier('element'),
                    j.identifier('moduleName'),
                    j.identifier('trackingId'),
                    j.identifier('metadata'),
                  ]
                )
              )
            ])
          )
        );
        onImpression.comments = [];
        onImpression.comments.push(
          j.commentBlock(`*
 * Fire custom impression event when module is rendered and in the viewport\n * @override
 *\n * @param {Object} metadata metadata object contain visibleTime and duration\n `, true, true)
      );
        onImpression.method = true;
        const appendedStatements = includeInit ? [onInit, onRender, onImpression] : [onRender, onImpression];
        // this will not work if init already defined, but will keep it this way to simplify things here
        node.properties = [trackingService].concat(node.properties).concat(appendedStatements);
        return node;
      });
  }
  return root.toSource({
    tabWidth: 2,
    useTabs: false,
    trailingComma: true,
    quote: 'single'
  });
}