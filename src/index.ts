import { AnySchema } from 'joi';
import Path from 'path';
import { writeFileSync } from 'fs';

import { Settings, ConvertedType } from './types';
import { convertFilesInDirectory } from './convertFilesInDirectory';
import { writeInterfaceFile } from './writeInterfaceFile';
import { convertSchemaInternal } from './analyseSchemaFile';

export { Settings };

/**
 * Apply defaults to the Partial Settings parameter
 *
 * @param settings Partial Setting object
 * @returns Complete Settings object
 */
function defaultSettings(settings: Partial<Settings>): Settings {
  const appSettings = Object.assign(
    {
      useLabelAsInterfaceName: false,
      defaultToRequired: false,
      schemaFileSuffix: 'Schema',
      debug: false,
      fileHeader: `/**
 * This file was automatically generated by joi-to-typescript
 * Do not modify this file manually
 */`,
      sortPropertiesByName: true,
      commentEverything: false,
      ignoreFiles: [],
      indentationChacters: '  ',
      honorCastTo: []
    },
    settings
  ) as Settings;

  return appSettings;
}

export function convertSchema(
  settings: Partial<Settings>,
  joi: AnySchema,
  exportedName?: string,
  root?: boolean
): ConvertedType | undefined {
  const appSettings = defaultSettings(settings);
  return convertSchemaInternal(appSettings, joi, exportedName, root);
}

export function getTypeFileNameFromSchema(schemaFileName: string, settings: Settings): string {
  return schemaFileName.endsWith(`${settings.schemaFileSuffix}.ts`)
    ? schemaFileName.substring(0, schemaFileName.length - `${settings.schemaFileSuffix}.ts`.length)
    : schemaFileName.replace('.ts', '');
}

/**
 * Write index.ts file
 *
 * @param settings - Settings Object
 * @param fileNamesToExport - List of file names that will be added to the index.ts file
 */
export function writeIndexFile(settings: Settings, fileNamesToExport: string[]): void {
  if (fileNamesToExport.length === 0) {
    // Don't write an index file if its going to export nothing
    return;
  }
  const exportLines = fileNamesToExport.map(fileName => `export * from './${fileName.replace(/\\/g, '/')}';`);
  const fileContent = `${settings.fileHeader}\n\n${exportLines.join('\n').concat('\n')}`;
  writeFileSync(Path.join(settings.typeOutputDirectory, 'index.ts'), fileContent);
}

/**
 * Create types from schemas from a directory
 *
 * @param settings - Configuration settings
 * @returns The success or failure of this operation
 */
export async function convertFromDirectory(settings: Partial<Settings>): Promise<boolean> {
  const appSettings = defaultSettings(settings);
  const filesInDirectory = await convertFilesInDirectory(appSettings, Path.resolve(appSettings.typeOutputDirectory));

  if (!filesInDirectory.types || filesInDirectory.types.length === 0) {
    throw new Error('No schemas found, cannot generate interfaces');
  }

  for (const exportType of filesInDirectory.types) {
    writeInterfaceFile(appSettings, exportType.typeFileName, filesInDirectory.types);
  }

  if (appSettings.indexAllToRoot || appSettings.flattenTree) {
    // Write index.ts
    writeIndexFile(appSettings, filesInDirectory.typeFileNames);
  }

  return true;
}
