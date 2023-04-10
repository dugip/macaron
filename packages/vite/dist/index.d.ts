import { BabelOptions } from '@macaron-css/integration';
import { PluginOption } from 'vite';

declare function macaronVitePlugin(options?: {
    babel?: BabelOptions;
}): PluginOption;

export { macaronVitePlugin };
