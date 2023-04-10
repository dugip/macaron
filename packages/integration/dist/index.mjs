var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});

// packages/integration/src/babel.ts
import { transformFileAsync } from "@babel/core";
import {
  macaronBabelPlugin,
  macaronStyledComponentsPlugin
} from "@macaron-css/babel";
async function babelTransform(path, babel = {}) {
  const options = { result: ["", ""], path };
  const result = await transformFileAsync(path, {
    ...babel,
    plugins: [
      ...Array.isArray(babel.plugins) ? babel.plugins : [],
      macaronStyledComponentsPlugin(),
      [macaronBabelPlugin(), options]
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
import { transformSync } from "@babel/core";
import { macaronStyledComponentsPlugin as macaronStyledComponentsPlugin2 } from "@macaron-css/babel";
import { addFileScope, getPackageInfo } from "@vanilla-extract/integration";
import defaultEsbuild from "esbuild";
import fs from "fs";
import { basename, dirname, join } from "path";
async function compile({
  esbuild = defaultEsbuild,
  filePath,
  cwd = process.cwd(),
  externals = [],
  contents,
  resolverCache,
  originalPath
}) {
  const packageInfo = getPackageInfo(cwd);
  let source;
  if (resolverCache.has(originalPath)) {
    source = resolverCache.get(originalPath);
  } else {
    source = addFileScope({
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
      resolveDir: dirname(filePath),
      sourcefile: basename(filePath)
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

              export * from ${JSON.stringify(__require.resolve("solid-js/web"))};
              `,
              resolveDir: dirname(args.path)
            };
          });
        }
      },
      {
        name: "macaron:custom-extract-scope",
        setup(build) {
          build.onLoad({ filter: /\.(t|j)sx?$/ }, async (args) => {
            const contents2 = await fs.promises.readFile(args.path, "utf8");
            let source2 = addFileScope({
              source: contents2,
              filePath: args.path,
              rootPath: build.initialOptions.absWorkingDir,
              packageName: packageInfo.name
            });
            source2 = transformSync(source2, {
              filename: args.path,
              plugins: [macaronStyledComponentsPlugin2()],
              presets: ["@babel/preset-typescript"],
              sourceMaps: false
            }).code;
            return {
              contents: source2,
              loader: "tsx",
              resolveDir: dirname(args.path)
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
      (filePath2) => join(cwd, filePath2)
    )
  };
}
export {
  babelTransform,
  compile
};
//# sourceMappingURL=index.mjs.map