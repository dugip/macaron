"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/integration/src/index.ts
var src_exports = {};
__export(src_exports, {
  babelTransform: () => babelTransform,
  compile: () => compile
});
module.exports = __toCommonJS(src_exports);

// packages/integration/src/babel.ts
var import_core = require("@babel/core");
var import_babel = require("@macaron-css/babel");
async function babelTransform(path, babel = {}) {
  const options = { result: ["", ""], path };
  const result = await (0, import_core.transformFileAsync)(path, {
    ...babel,
    plugins: [
      ...Array.isArray(babel.plugins) ? babel.plugins : [],
      (0, import_babel.macaronStyledComponentsPlugin)(),
      [(0, import_babel.macaronBabelPlugin)(), options]
    ],
    presets: [
      ...Array.isArray(babel.presets) ? babel.presets : [],
      "@babel/preset-typescript"
    ],
    sourceMaps: false
  });
  if (result === null || result.code === null)
    throw new Error(`Could not transform ${path}`);
  return { result: options.result, code: result.code };
}

// packages/integration/src/compile.ts
var import_core2 = require("@babel/core");
var import_babel2 = require("@macaron-css/babel");
var import_integration = require("@vanilla-extract/integration");
var import_esbuild = __toESM(require("esbuild"));
var import_fs = __toESM(require("fs"));
var import_path = require("path");
async function compile({
  esbuild = import_esbuild.default,
  filePath,
  cwd = process.cwd(),
  externals = [],
  contents,
  resolverCache,
  originalPath
}) {
  const packageInfo = (0, import_integration.getPackageInfo)(cwd);
  let source;
  if (resolverCache.has(originalPath)) {
    source = resolverCache.get(originalPath);
  } else {
    source = (0, import_integration.addFileScope)({
      source: contents,
      filePath: originalPath,
      rootPath: cwd,
      packageName: packageInfo.name
    });
    resolverCache.set(originalPath, source);
  }
  const result = await esbuild.build({
    stdin: {
      contents: source,
      loader: "tsx",
      resolveDir: (0, import_path.dirname)(filePath),
      sourcefile: (0, import_path.basename)(filePath)
    },
    metafile: true,
    bundle: true,
    external: [
      "@vanilla-extract",
      "@macaron-css",
      ...externals
    ],
    platform: "node",
    write: false,
    absWorkingDir: cwd,
    plugins: [
      {
        name: "macaron:stub-solid-template-export",
        setup(build) {
          build.onResolve({ filter: /^solid-js\/web$/ }, (args) => {
            return {
              namespace: "solid-web",
              path: args.path
            };
          });
          build.onLoad({ filter: /.*/, namespace: "solid-web" }, async (args) => {
            return {
              contents: `
              const noop = () => {
                return new Proxy({}, {
                  get() {
                    throw new Error("macaron: This file tried to call template() directly and use its result. Please check your compiled solid-js output and if it is correct, please file an issue at https://github.com/mokshit06/macaron/issues");
                  }
                });
              }

              export const template = noop;
              export const delegateEvents = noop;

              export * from ${JSON.stringify(require.resolve("solid-js/web"))};
              `,
              resolveDir: (0, import_path.dirname)(args.path)
            };
          });
        }
      },
      {
        name: "macaron:custom-extract-scope",
        setup(build) {
          build.onLoad({ filter: /\.(t|j)sx?$/ }, async (args) => {
            const contents2 = await import_fs.default.promises.readFile(args.path, "utf8");
            let source2 = (0, import_integration.addFileScope)({
              source: contents2,
              filePath: args.path,
              rootPath: build.initialOptions.absWorkingDir,
              packageName: packageInfo.name
            });
            source2 = (0, import_core2.transformSync)(source2, {
              filename: args.path,
              plugins: [(0, import_babel2.macaronStyledComponentsPlugin)()],
              presets: ["@babel/preset-typescript"],
              sourceMaps: false
            }).code;
            return {
              contents: source2,
              loader: "tsx",
              resolveDir: (0, import_path.dirname)(args.path)
            };
          });
        }
      }
    ]
  });
  const { outputFiles, metafile } = result;
  if (!outputFiles || outputFiles.length !== 1) {
    throw new Error("Invalid child compilation");
  }
  return {
    source: outputFiles[0].text,
    watchFiles: Object.keys((metafile == null ? void 0 : metafile.inputs) || {}).map(
      (filePath2) => (0, import_path.join)(cwd, filePath2)
    )
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  babelTransform,
  compile
});
//# sourceMappingURL=index.js.map