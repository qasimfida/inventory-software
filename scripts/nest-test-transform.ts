import ts from 'typescript';
import type { Plugin } from 'vite';

// Nest needs legacy decorators and runtime metadata, including in HTTP tests.
export function nestTestTransform(): Plugin {
  return {
    name: 'nest-test-typescript',
    enforce: 'pre',
    transform(source, id) {
      if (!id.includes('/apps/api/') || !id.endsWith('.ts')) return;
      const result = ts.transpileModule(source, {
        fileName: id,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          sourceMap: true,
        },
      });
      return { code: result.outputText, map: result.sourceMapText ?? null };
    },
  };
}
