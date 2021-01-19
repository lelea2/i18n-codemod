function findImports (j, ast, pkg) {
  return ast.find(j.ImportDeclaration, {
    source: {
      value: pkg
    }
  });
};

/**
 * Detects CommonJS and import statements for the given package.
 * @return true if import were found, else false
 */
function hasRequireOrImport (j, ast, pkg) {
  // const requires = findRequires(j, ast, pkg).size()
  const imports = findImports(j, ast, pkg).size();
  return imports > 0
};
module.exports = {
  findImports,
  hasRequireOrImport,
};