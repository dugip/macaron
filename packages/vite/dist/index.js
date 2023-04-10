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

// packages/vite/src/index.ts
var src_exports = {};
__export(src_exports, {
  macaronVitePlugin: () => macaronVitePlugin
});
module.exports = __toCommonJS(src_exports);
var import_integration = require("@macaron-css/integration");
var import_integration2 = require("@vanilla-extract/integration");
var import_fs = __toESM(require("fs"));
var import_path = require("path");
var import_vite = require("vite");
var extractedCssFileFilter = /extracted_(.*)\.css\.ts(\?used)?$/;
function macaronVitePlugin(options) {
  let config;
  let server;
  const cssMap = /* @__PURE__ */ new Map();
  const resolverCache = /* @__PURE__ */ new Map();
  const resolvers = /* @__PURE__ */ new Map();
  const idToPluginData = /* @__PURE__ */ new Map();
  const virtualExt = ".vanilla.css";
  return {
    name: "macaron-css-vite",
    enforce: "pre",
    buildStart() {
      resolvers.clear();
      idToPluginData.clear();
      resolverCache.clear();
      cssMap.clear();
    },
    configureServer(_server) {
      server = _server;
    },
    async configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    resolveId(id, importer, options2) {
      if (id.startsWith("\0"))
        return;
      if (extractedCssFileFilter.test(id)) {
        const normalizedId = id.startsWith("/") ? id.slice(1) : id;
        let resolvedPath = (0, import_vite.normalizePath)((0, import_path.join)(importer, "..", normalizedId));
        if (!resolvers.has(resolvedPath)) {
          return;
        }
        return resolvedPath;
      }
      if (id.endsWith(virtualExt)) {
        const normalizedId = id.startsWith("/") ? id.slice(1) : id;
        const key = (0, import_vite.normalizePath)((0, import_path.resolve)(config.root, normalizedId));
        if (cssMap.has(key)) {
          return key;
        }
      }
    },
    async load(id, options2) {
      if (id.startsWith("\0"))
        return;
      if (extractedCssFileFilter.test(id)) {
        let normalizedId = customNormalize(id);
        let pluginData = idToPluginData.get(normalizedId);
        if (!pluginData) {
          return null;
        }
        const resolverContents = resolvers.get(pluginData.path);
        if (!resolverContents) {
          return null;
        }
        idToPluginData.set(id, {
          ...idToPluginData.get(id),
          filePath: id,
          originalPath: pluginData.mainFilePath
        });
        return resolverContents;
      }
      if (id.endsWith(virtualExt)) {
        const cssFileId = (0, import_vite.normalizePath)((0, import_path.resolve)(config.root, id));
        const css = cssMap.get(cssFileId);
        if (typeof css !== "string") {
          return;
        }
        return css;
      }
    },
    async transform(code, id, ssrParam) {
      if (id.startsWith("\0"))
        return;
      const moduleInfo = idToPluginData.get(id);
      let ssr;
      if (typeof ssrParam === "boolean") {
        ssr = ssrParam;
      } else {
        ssr = ssrParam == null ? void 0 : ssrParam.ssr;
      }
      if (moduleInfo && moduleInfo.originalPath && moduleInfo.filePath && extractedCssFileFilter.test(id)) {
        const { source, watchFiles } = await (0, import_integration.compile)({
          filePath: moduleInfo.filePath,
          cwd: config.root,
          originalPath: moduleInfo.originalPath,
          contents: code,
          resolverCache,
          externals: []
        });
        for (const file of watchFiles) {
          if (extractedCssFileFilter.test(file)) {
            continue;
          }
          if (config.command === "build" || file !== id) {
            this.addWatchFile(file);
          }
        }
        try {
          const contents = await (0, import_integration2.processVanillaFile)({
            source,
            filePath: moduleInfo.filePath,
            identOption: config.mode === "production" ? "short" : "debug",
            serializeVirtualCssPath: async ({ fileScope, source: source2 }) => {
              const id2 = `${fileScope.filePath}${virtualExt}`;
              const cssFileId = (0, import_vite.normalizePath)((0, import_path.resolve)(config.root, id2));
              if (server) {
                const { moduleGraph } = server;
                const moduleId = (0, import_vite.normalizePath)((0, import_path.join)(config.root, id2));
                const module2 = moduleGraph.getModuleById(moduleId);
                if (module2) {
                  moduleGraph.invalidateModule(module2);
                  module2.lastHMRTimestamp = module2.lastInvalidationTimestamp || Date.now();
                }
              }
              cssMap.set(cssFileId, source2);
              return `import "${id2}";`;
            }
          });
          return contents;
        } catch (error) {
          throw error;
        }
      }
      if (/(j|t)sx?(\?used)?$/.test(id) && !id.endsWith(".vanilla.js")) {
        if (id.includes("node_modules"))
          return;
        if (id.endsWith(".css.ts"))
          return;
        try {
          await import_fs.default.promises.access(id, import_fs.default.constants.F_OK);
        } catch {
          return;
        }
        const {
          code: code2,
          result: [file, cssExtract]
        } = await (0, import_integration.babelTransform)(id, options == null ? void 0 : options.babel);
        if (!cssExtract || !file)
          return null;
        if (config.command === "build" && config.build.watch) {
          this.addWatchFile(id);
        }
        let resolvedCssPath = (0, import_vite.normalizePath)((0, import_path.join)(id, "..", file));
        if (server && resolvers.has(resolvedCssPath)) {
          const { moduleGraph } = server;
          const module2 = moduleGraph.getModuleById(resolvedCssPath);
          if (module2) {
            moduleGraph.invalidateModule(module2);
          }
        }
        const normalizedCssPath = customNormalize(resolvedCssPath);
        resolvers.set(resolvedCssPath, cssExtract);
        resolverCache.delete(id);
        idToPluginData.delete(id);
        idToPluginData.delete(normalizedCssPath);
        idToPluginData.set(id, {
          ...idToPluginData.get(id),
          mainFilePath: id
        });
        idToPluginData.set(normalizedCssPath, {
          ...idToPluginData.get(normalizedCssPath),
          mainFilePath: id,
          path: resolvedCssPath
        });
        return {
          code: code2
        };
      }
      return null;
    }
  };
}
function customNormalize(path) {
  return path.startsWith("/") ? path.slice(1) : path;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  macaronVitePlugin
});
//# sourceMappingURL=index.js.map