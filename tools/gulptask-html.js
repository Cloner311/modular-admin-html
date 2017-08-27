const gulp  = require('gulp');
const plugins = require('gulp-load-plugins')();

const path  = require('path');
const glob  = require('glob');
const fs    = require('fs-extra');
const through = require('through2');
const File = require('vinyl');
const StringDecoder = require('string_decoder').StringDecoder;
const dotenv = require('dotenv');

const frontMatter = require('front-matter');
const handlebars = require('handlebars');
const handlebarsRegistrar = require('handlebars-registrar');

const config  = require('../config');
const paths = require('./_paths');
const partials = {};

module.exports = function() {

  // Register handlebars engine helpers and partials
  handlebarsRegistrar(handlebars, {
    helpers: paths.helpers,
    partials: paths.partials,
    parsePartialName: function (partial) {

      // Save in partials vinyl registry
      partials[partial.shortPath] = new File({
        cwd: partial.cwd,
        path: partial.path,
        base: path.basename(partial.path),
        contents: fs.readFileSync(partial.path)
      });

      return partial.shortPath;
    },
    bustCache: true,
  });

  // Template file contexts
  const contexts = {};

  return gulp.src(paths.pages)
    // Render pages
    .pipe(through.obj(function (file, enc, cb) {

      const context = getTemplateContext(file);
      const contextKey = path.relative(config.CLIENT_DIR, file.path);

      contexts[contextKey] = context;

      // console.log('--------------');
      // console.log(path.relative(config.CLIENT_DIR, file.path));
      // console.log(file.cwd);
      // console.log(file.base);
      // console.log(file.path);

      // Cache the context

      // console.log(context);
      // console.log(file.path);
      // console.log(file.ChartJS);

      file.contents = new Buffer(
        renderTemplate(file, context)
      );

      this.push(file);
      cb();
    }))
    // Handle errors
    .on('error', plugins.util.log)

    // pretify html structure
    .pipe(plugins.prettify({
      indent_size: 2
    }))

    // Rename .page.hbs to .html
    // Rename main page to index
    // Apply output path parameters
    .pipe(plugins.rename(function (path) {

      const context = contexts[
        `${path.dirname}/${path.basename}${path.extname}`
      ];

      // Replace .page
      path.basename = path.basename.replace(".page", "");

      // Flattent directory
      path.dirname = '';

      // Replace extension
      path.extname = ".html"

      // Use custom filename if needed
      path.basename = context.filename || path.basename;

      // Use custom dirname if needed
      path.dirname = context.dirname || path.dirname;

    }))

    // Output
    .pipe(gulp.dest(config.DIST_DIR));

};

function renderTemplate(file, context) {
  // Page render result
  let pageRes = "";

  // New instance of template context
  const templateContext = context ? Object.assign({}, context) : {};

  // Compile template without yaml headers
  const template = handlebars.compile(
    String(file.contents).replace(/---(.|\n)*---/, '')
  );
  const templateRes = template(templateContext);

  // Layout processing
  const layout = context.layout || null;

  // If the layout exists, render it with template inside
  if (layout && partials[layout] && handlebars.partials[layout]) {

    // New vinyl file based on partail vinyl
    const layoutFile = new File(partials[layout]);
    const layoutContext = getTemplateContext(layoutFile);

    // Remove layout parameter from template context
    delete templateContext.layout;

    // Add body to context
    Object.assign(layoutContext, templateContext, {
      body: templateRes
    });

    // Call recursively render template again
    pageRes = renderTemplate(layoutFile, layoutContext);
  }
  // Return rendered template
  else {
    pageRes = templateRes;
  }

  return pageRes;
}

function getTemplateContext(file) {

  // Get context from _context.js, .env, process.env, frontmatter and parent files
  const contextExternal = getTemplateContextExternal(file);

  // Frontmatter context
  const contextInternal = getTemplateContextInternal(file);

  // Result context
  const context = Object.assign({}, contextExternal, contextInternal);


  return context;
}


function getTemplateContextInternal(file) {
  // Read content from front matter
  const content = frontMatter(file.contents.toString('utf8'));

  return content.attributes || {};
}

function getTemplateContextExternal(file) {

  // Initial context
  const context = {};

  // Environment
  const envContext = process.env;

  // .env
  const dotEnvContext = dotenv.config({
    silent: true,
    path: path.resolve(config.ROOT_DIR, '.env')
  });

  //
  Object.assign(context, envContext, dotEnvContext);

  // Package data
  context.pkg = require('../package.json');

  var rootDir = path.resolve(config.CLIENT_DIR);
  var pageDir = path.dirname(file.path);

  var contextPaths = [];

  // Start going up from page directory until root directory
  for (var activeDir = pageDir; activeDir.length >= rootDir.length; activeDir = path.resolve(activeDir, '../') ) {
    contextPaths.push(
      path.resolve(activeDir, '_context.js')
    );
  }

  // Reverse context, so the iteration will start from root level context
  contextPaths.reverse();


  contextPaths.map(function(filePath) {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    var localContext = require(filePath);

    Object.assign(context, localContext);
  });


  return context;
}
