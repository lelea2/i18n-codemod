function flatten(node) {
  const isBE = node && node.type === 'BinaryExpression';
  const isPLUS = node.operator === '+';
  return isBE && isPLUS ?
    [...flatten(node.left), ...flatten(node.right)]
    : [ node ];
}

function isStringNode (node) {
  const isLiteral = node.type === 'Literal';
  const isString = typeof node.value === 'string';
  return isLiteral && isString;
}

module.exports = function (j, p) {
  const nodes = flatten(p.node);
  if (!nodes.some(isStringNode)) {
    return p.node;
  }
  function map (list, fn, accumulator) {
    while (list.length) {
      fn(list.shift(), accumulator);
    }
    return accumulator;
  }
  function build (x, o) {
    if (x.type === 'Literal') {
      o.temp += x.value;
    } else {
      const te = { cooked: o.temp, raw: o.temp };
      o.temp = '';
      o.quasis.push(j.templateElement(te, false));
      o.exps.push(x);
    }
  }
  const o = map(nodes, build, { quasis: [], exps: [], temp:'' });
  const s = o.temp;
  const exps = o.exps;
  const quasis = o.quasis;
  // @TODO: handle (un)escaping
  quasis.push(j.templateElement({
    cooked:s, raw:s
  }, true));
  return j.templateLiteral(quasis, exps);
};