import { RolldownMagicString, type Plugin } from "rolldown";
import { bundleAsync, type CustomAtRules, type TransformOptions } from "lightningcss";
import sourceMapRemapping from "@jridgewell/remapping";
import { basename, dirname, relative } from "node:path/posix";

const PLACEHOLDER_HASH = "816023b999a71aed";
const ENTRY_HINT = `__ROLLUP_ENTRY__${PLACEHOLDER_HASH}`;
const URL_PLACEHOLDER_PREFIX = `__ROLLUP_FILE_URL_`;
const URL_PLACEHOLDER_SUFFIX = `__${PLACEHOLDER_HASH}`;
const URL_PLACEHOLDER_REGEXP = new RegExp(
  `${RegExp.escape(URL_PLACEHOLDER_PREFIX)}(.+?)${RegExp.escape(URL_PLACEHOLDER_SUFFIX)}`,
  "g",
);

export interface LightningcssOptions<C extends CustomAtRules> extends Pick<
  TransformOptions<C>,
  | "customAtRules"
  | "drafts"
  | "errorRecovery"
  | "exclude"
  | "include"
  | "minify"
  | "nonStandard"
  | "pseudoClasses"
  | "targets"
  | "unusedSymbols"
  | "visitor"
  | "sourceMap"
> {}

const decoder = new TextDecoder();

export function lightningcss<C extends CustomAtRules>(options?: LightningcssOptions<C>): Plugin {
  return {
    name: "lightningcss",

    transform: {
      order: "post",
      filter: {
        moduleType: ["css"],
      },
      async handler(inputCode, id) {
        // --- 1. Bundle code using lightningcss ----------------

        const bundled = await bundleAsync({
          filename: id,
          resolver: {
            read: (file) => {
              if (file === id) return inputCode;
              return this.fs.readFile(file, { encoding: "utf8" });
            },
            resolve: async (id, importer) => {
              const resolved = await this.resolve(id, importer);
              if (!resolved) {
                throw this.error(`Unable to resolve module '${id}'.`);
              }
              if (resolved.external) {
                return { external: resolved.id } as any;
              }
              return resolved.id;
            },
          },
          analyzeDependencies: {
            preserveImports: true,
          },
          ...options,
        });

        const draftCss = decoder
          .decode(bundled.code)
          .replaceAll("`", "\\`")
          .replaceAll("${", "\\${");

        // --- 2. Resolve dependencies using magic string -----------

        const magicString = new RolldownMagicString(draftCss, { filename: id });

        for (const dependency of bundled.dependencies!) {
          switch (dependency.type) {
            case "url": {
              const resolved = await this.resolve(dependency.url, id, { kind: "new-url" });
              if (!resolved) {
                throw this.error(`Unable to resolve '${dependency.url}'.`, dependency.loc.start);
              }

              const content = await this.fs.readFile(resolved.id);

              const referenceId = this.emitFile({
                type: "asset",
                name: basename(resolved.id),
                source: content,
              });

              magicString.replace(dependency.placeholder, getUrlPlaceholder(referenceId));
              break;
            }

            case "import": {
              magicString.replace(dependency.placeholder, dependency.url);
              break;
            }

            default:
              this.error(`Unsupported dependency '${dependency.type}'.`);
          }
        }

        // --- 3. Combine source maps ------------

        const finalCss = magicString.toString();

        const finalMap = options?.sourceMap
          ? sourceMapRemapping(
              [magicString.generateMap().toString(), decoder.decode(bundled.map!)],
              () => null,
            ).toString()
          : null;

        // --- 4. Convert to JavaScript ---------------------

        const info = this.getModuleInfo(id);
        const isEntry = info?.isEntry;

        const outputCode =
          `export default \`${finalCss}\`;` +
          (isEntry ? `\nexport const ${ENTRY_HINT} = true;` : "");

        return {
          code: outputCode,
          map: finalMap,
          moduleType: "js",
        };
      },
    },

    async generateBundle(_outputOptions, bundle) {
      for (const [name, chunk] of Object.entries(bundle)) {
        if (
          chunk.type === "chunk" &&
          chunk.isEntry &&
          chunk.facadeModuleId &&
          chunk.facadeModuleId.endsWith(".css") &&
          chunk.code.includes(ENTRY_HINT)
        ) {
          const code = chunk.code.replaceAll(URL_PLACEHOLDER_REGEXP, (...args) =>
            toRelative(this.getFileName(args[1]), chunk.fileName),
          );
          const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
          const exports = await import(dataUrl);

          delete bundle[name];
          this.emitFile({
            type: "asset",
            source: exports.default,
            fileName: name.replace(/\.js$/, ".css"),
          });
        }
      }
    },
  };
}

function toRelative(path: string, parent: string) {
  let result = relative(dirname(parent), path);
  if (!result.startsWith("../")) {
    result = "./" + result;
  }
  return result;
}

function getUrlPlaceholder(referenceId: string) {
  return `${URL_PLACEHOLDER_PREFIX}${referenceId}${URL_PLACEHOLDER_SUFFIX}`;
}
