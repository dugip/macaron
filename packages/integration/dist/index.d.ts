import { TransformOptions } from '@babel/core';
import { PluginBuild } from 'esbuild';

declare type BabelOptions = Omit<TransformOptions, 'ast' | 'filename' | 'root' | 'sourceFileName' | 'sourceMaps' | 'inputSourceMap'>;
declare function babelTransform(path: string, babel?: BabelOptions): Promise<{
    result: [string, string];
    code: string | undefined;
}>;

interface CompileOptions {
    esbuild?: PluginBuild['esbuild'];
    filePath: string;
    contents: string;
    cwd?: string;
    externals?: Array<string>;
    resolverCache: Map<string, string>;
    originalPath: string;
}
declare function compile({ esbuild, filePath, cwd, externals, contents, resolverCache, originalPath, }: CompileOptions): Promise<{
    source: string;
    watchFiles: string[];
}>;

export { BabelOptions, babelTransform, compile };
