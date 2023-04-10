// packages/vite/src/index.ts
import { babelTransform, compile } from "@macaron-css/integration";
import { processVanillaFile } from "@vanilla-extract/integration";
import fs from "fs";
import { join, resolve } from "path";
import { normalizePath } from "vite";
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
        let resolvedPath = normalizePath(join(importer, "..", normalizedId));
        if (!resolvers.has(resolvedPath)) {
          return;
        }
        return resolvedPath;
      }
      if (id.endsWith(virtualExt)) {
        const normalizedId = id.startsWith("/") ? id.slice(1) : id;
        const key = normalizePath(resolve(config.root, normalizedId));
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
        const cssFileId = normalizePath(resolve(config.root, id));
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
        const { source, watchFiles } = await compile({
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
          const contents = await processVanillaFile({
            source,
            filePath: moduleInfo.filePath,
            identOption: config.mode === "production" ? "short" : "debug",
            serializeVirtualCssPath: async ({ fileScope, source: source2 }) => {
              const id2 = `${fileScope.filePath}${virtualExt}`;
              const cssFileId = normalizePath(resolve(config.root, id2));
              if (server) {
                const { moduleGraph } = server;
                const moduleId = normalizePath(join(config.root, id2));
                const module = moduleGraph.getModuleById(moduleId);
                if (module) {
                  moduleGraph.invalidateModule(module);
                  module.lastHMRTimestamp = module.lastInvalidationTimestamp || Date.now();
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
          await fs.promises.access(id, fs.constants.F_OK);
        } catch {
          return;
        }
        const {
          code: code2,
          result: [file, cssExtract]
        } = await babelTransform(id, options == null ? void 0 : options.babel);
        if (!cssExtract || !file)
          return null;
        if (config.command === "build" && config.build.watch) {
          this.addWatchFile(id);
        }
        let resolvedCssPath = normalizePath(join(id, "..", file));
        if (server && resolvers.has(resolvedCssPath)) {
          const { moduleGraph } = server;
          const module = moduleGraph.getModuleById(resolvedCssPath);
          if (module) {
            moduleGraph.invalidateModule(module);
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
export {
  macaronVitePlugin
};
//# sourceMappingURL=index.mjs.map