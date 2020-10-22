const fs = require('fs');
const { execSync } = require('child_process');
const jsYaml = require('js-yaml');

const PLUGIN_NAME = 'remark-metadata';
const MATTER_NODES = ['yaml', 'toml'];

/**
 * Get's a matter node from the given AST.
 *
 * @param  {Object} ast
 * @return {Object|undefined}
 */
function getMatterNode(ast) {
  // Note we don't have to traverse the AST because matter will be in root
  return ast.children.find(node => MATTER_NODES.includes(node.type));
}

/**
 * Get the frontmatter from the MDAST. If it doesn't exist, an empty
 * one will be created.
 *
 * @see https://github.com/wooorm/remark-frontmatter
 * @param  {Object} ast
 * @return {Object} a MDAST-like node for Frontmatter.
 */
function getMatter(ast) {
  let fm = getMatterNode(ast);

  // No front matter, create an empty matter node.
  if (!fm) {
    fm = {
      type: 'yaml',
      value: '',
    };
  }

  return fm;
}

/**
 * Given a frontmatter node, write the meta data into it.
 *
 * @param  {Object} frontmatterNode a MDAST-like node for Frontmatter.
 * @param  {Object} meta
 * @param  {Object} metadataConfig
 */
function writeMatter(frontmatterNode, meta, metadataConfig) {
  const fm = {};

  // parse any existing frontmatter
  if (frontmatterNode.value) {
    Object.assign(fm, jsYaml.safeLoad(frontmatterNode.value));
  }

  // merge in meta
  Object.entries(meta).forEach(([name, value]) => {
    const { shouldUpdate } = metadataConfig[name];

    if (typeof shouldUpdate !== 'function' || shouldUpdate(value, fm[name])) {
      fm[name] = value;
    }
  });

  // stringify
  frontmatterNode.value = jsYaml.safeDump(fm).trim(); // eslint-disable-line no-param-reassign
}

/**
 * Get the modified time of a vFile.
 *
 * If has git return the last commit time of this vFile,
 * otherwise using the mtime.
 *
 * @param  {vFile}   vFile
 * @param  {boolean} hasGit
 * @return {string}
 */
function getModifiedTime(vFile, hasGit) {
  if (hasGit) {
    const cmd = `git log -1 --format="%ad" -- "${vFile.path}"`;
    const modified = execSync(cmd, { encoding: 'utf-8' }).trim();

    // New files that aren't committed yet will return nothing
    if (modified) {
      return new Date(modified).toUTCString();
    }

    return '';
  }

  try {
    const stats = fs.statSync(vFile.path);
    return new Date(stats.mtime).toUTCString();
  } catch (error) {
    vFile.message(error, null, PLUGIN_NAME);
  }

  return '';
}

/**
 * Get the created time of a vFile.
 *
 * If has git return the first commit time of this vFile,
 * otherwise using the ctime.
 *
 * @param  {vFile}   vFile
 * @param  {boolean} hasGit
 * @return {string}
 */
function getCreatedTime(vFile, hasGit) {
  if (hasGit) {
    const cmd = `git log --reverse --format="%ad" -- "${vFile.path}"`;
    const created = execSync(cmd, { encoding: 'utf-8' }).trim().split('\n')[0];

    // New files that aren't committed yet will return nothing
    if (created) {
      return new Date(created).toUTCString();
    }

    return '';
  }

  try {
    const stats = fs.statSync(vFile.path);
    return new Date(stats.ctime).toUTCString();
  } catch (error) {
    vFile.message(error, null, PLUGIN_NAME);
  }

  return '';
}

/**
 * Given the vFile, metadata returns an object containing possible meta data
 *
 * @param  {vFile}   vFile
 * @param  {boolean} hasGit
 * @param  {Object}  metadata
 * @return {Object}
 */
function getMetadata(vFile, hasGit, metadataConfig) {
  /* eslint-disable no-use-before-define */
  const meta = {};

  Object.entries(metadataConfig).forEach(([name, config]) => {
    const value =
      typeof config === 'string' || typeof config === 'function'
        ? config
        : config.value;

    if (value === metadata.LAST_MODIFIED_TIME) {
      meta[name] = getModifiedTime(vFile, hasGit);
      return;
    }

    if (value === metadata.CREATED_TIME) {
      meta[name] = getCreatedTime(vFile, hasGit);
      return;
    }

    if (typeof value === 'string') {
      meta[name] = value;
      return;
    }

    if (typeof value === 'function') {
      meta[name] = value({
        modifiedTime: getModifiedTime(vFile, hasGit),
        createdTime: getCreatedTime(vFile, hasGit),
        vFile,
      });
    }
  });

  return meta;
  /* eslint-enable no-use-before-define */
}

/**
 * Returns the transformer which acts on the MDAST tree and given VFile.
 *
 * @link https://github.com/unifiedjs/unified#function-transformernode-file-next
 * @link https://github.com/syntax-tree/mdast
 * @link https://github.com/vfile/vfile
 * @return {function}
 */
function metadata(options = {}) {
  const hasGit = options.git !== undefined ? options.git : true;
  const metadataConfig = options.metadata || {};

  /**
   * @param {object}    ast   MDAST
   * @param {vFile}     vFile
   * @param {function}  next
   * @return {object}
   */
  return function transformer(ast, vFile, next) {
    // Get frontmatter node from AST
    const frontmatterNode = getMatter(ast);

    // Get metadata
    const meta = getMetadata(vFile, hasGit, metadataConfig);

    // Write metadata (by reference)
    writeMatter(frontmatterNode, meta, metadataConfig);

    // If we don't have a Matter node in the AST, put it in.
    if (!getMatterNode(ast)) {
      ast.children.unshift(frontmatterNode);
    }

    if (typeof next === 'function') {
      return next(null, ast, vFile);
    }

    return ast;
  };
}

metadata.LAST_MODIFIED_TIME = 'REMARK_METADATA_LAST_MODIFIED_TIME';
metadata.CREATED_TIME = 'REMARK_METADATA_CREATED_TIME';

module.exports = metadata;
