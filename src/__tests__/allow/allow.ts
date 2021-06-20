import Joi from 'joi';
import { existsSync, readFileSync, rmdirSync } from 'fs';

import { convertFromDirectory, convertSchema } from '../../index';

const typeOutputDirectory = './src/__tests__/allow/interfaces';

describe('union types using allow()', () => {
  beforeAll(() => {
    if (existsSync(typeOutputDirectory)) {
      rmdirSync(typeOutputDirectory, { recursive: true });
    }
  });

  test('many variations of `allow()`', () => {
    // allowing an empty string is still just a string
    const schema = Joi.object({
      name: Joi.string().optional().description('Test Schema Name').allow(''),
      nullName: Joi.string().optional().description('nullable').allow(null),
      blankNull: Joi.string().optional().allow(null, ''),
      blank: Joi.string().allow(''),
      normalList: Joi.string().allow('red', 'green', 'blue'),
      normalRequiredList: Joi.string().allow('red', 'green', 'blue').required(),
      numbers: Joi.number().optional().allow(1, 2, 3, 4, 5),
      nullNumber: Joi.number().optional().allow(null),
      date: Joi.date().allow(null).description('This is date')
    })
      .meta({ className: 'TestSchema' })
      .description('a test schema definition');

    const result = convertSchema({ sortPropertiesByName: false }, schema);
    expect(result).not.toBeUndefined;
    expect(result?.content).toBe(`/**
 * a test schema definition
 */
export interface TestSchema {
  /**
   * Test Schema Name
   */
  name?: string;
  /**
   * nullable
   */
  nullName?: string | null;
  blankNull?: string | null | '';
  blank?: string;
  normalList?: 'red' | 'green' | 'blue';
  normalRequiredList: 'red' | 'green' | 'blue';
  numbers?: 1 | 2 | 3 | 4 | 5;
  nullNumber?: number | null;
  /**
   * This is date
   */
  date?: Date | null;
}`);
  });

  test('test an invalid variation of `allow()`', () => {
    expect(() => {
      const invalidSchema = Joi.object({
        blankNullUndefined: Joi.string().optional().allow(null, '', undefined),
        blankNullUndefinedRequired: Joi.string().required().allow(null, '', undefined)
      })
        .meta({ className: 'TestSchema' })
        .description('a test schema definition');

      const invalidResult = convertSchema({}, invalidSchema);
      console.log(invalidResult);
    }).toThrow();
  });

  test('null `allow()`', () => {
    const schema = Joi.object({
      obj: Joi.object().allow(null),
      arr: Joi.array().items(Joi.string()).allow(null),
      // then some tests for things you can do but probably shouldnt
      sillyProperty: Joi.object().allow(null, 'joe'),
      sillyArray: Joi.array().items(Joi.string()).allow(null, 'fred')
    }).meta({ className: 'TestSchema' });

    const result = convertSchema({ sortPropertiesByName: false }, schema);
    expect(result).not.toBeUndefined;
    expect(result?.content).toBe(`export interface TestSchema {
  obj?: object | null;
  arr?: string[] | null;
  sillyProperty?: object | null | 'joe';
  sillyArray?: string[] | null | 'fred';
}`);
  });

  test('object allow null on complex type', async () => {
    const result = await convertFromDirectory({
      schemaDirectory: './src/__tests__/allow/schemas',
      typeOutputDirectory
    });

    expect(result).toBe(true);

    const oneContent = readFileSync(`${typeOutputDirectory}/Parent.ts`).toString();

    expect(oneContent).toBe(
      `/**
 * This file was automatically generated by joi-to-typescript
 * Do not modify this file manually
 */

export interface Child {
  item: number;
}

export interface Parent {
  child: Child | null;
}
`
    );
  });
});
