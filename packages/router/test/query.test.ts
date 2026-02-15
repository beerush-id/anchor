import { describe, expect, it } from 'vitest';
import { parseQuery } from '../src/query.js';

describe('query.ts', () => {
  describe('parseQuery', () => {
    it('should return empty object for empty string', () => {
      const result = parseQuery('');
      expect(result).toEqual({});
    });

    it('should return empty object for "?" only', () => {
      const result = parseQuery('?');
      expect(result).toEqual({});
    });

    it('should return empty object for undefined', () => {
      const result = parseQuery(undefined as never);
      expect(result).toEqual({});
    });

    it('should parse single key-value pair', () => {
      const result = parseQuery('?name=John');
      expect(result).toEqual({ name: 'John' });
    });

    it('should parse multiple key-value pairs', () => {
      const result = parseQuery('?name=John&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should parse three key-value pairs', () => {
      const result = parseQuery('?name=John&age=30&city=NYC');
      expect(result).toEqual({ name: 'John', age: '30', city: 'NYC' });
    });

    it('should handle duplicate keys by converting to array', () => {
      const result = parseQuery('?tags=js&tags=ts');
      expect(result).toEqual({ tags: ['js', 'ts'] });
    });

    it('should handle three duplicate keys', () => {
      const result = parseQuery('?tags=js&tags=ts&tags=py');
      expect(result).toEqual({ tags: ['js', 'ts', 'py'] });
    });

    it('should handle multiple duplicate keys', () => {
      const result = parseQuery('?tags=js&tags=ts&tags=py&tags=go');
      expect(result).toEqual({ tags: ['js', 'ts', 'py', 'go'] });
    });

    it('should handle mix of single and duplicate keys', () => {
      const result = parseQuery('?name=John&tags=js&tags=ts&age=30');
      expect(result).toEqual({ name: 'John', tags: ['js', 'ts'], age: '30' });
    });

    it('should handle values with special characters', () => {
      const result = parseQuery('?email=test%40example.com');
      expect(result).toEqual({ email: 'test@example.com' });
    });

    it('should handle values with spaces', () => {
      const result = parseQuery('?name=John%20Doe');
      expect(result).toEqual({ name: 'John Doe' });
    });

    it('should handle values with plus signs', () => {
      const result = parseQuery('?name=John+Doe');
      expect(result).toEqual({ name: 'John Doe' });
    });

    it('should handle values with ampersands', () => {
      const result = parseQuery('?text=Hello%26World');
      expect(result).toEqual({ text: 'Hello&World' });
    });

    it('should handle values with equals signs', () => {
      const result = parseQuery('?equation=1%2B1%3D2');
      expect(result).toEqual({ equation: '1+1=2' });
    });

    it('should handle values with question marks', () => {
      const result = parseQuery('?question=What%3F');
      expect(result).toEqual({ question: 'What?' });
    });

    it('should handle values with hash signs', () => {
      const result = parseQuery('?tag=%23tag');
      expect(result).toEqual({ tag: '#tag' });
    });

    it('should handle values with slashes', () => {
      const result = parseQuery('?path=%2Fhome%2Fuser');
      expect(result).toEqual({ path: '/home/user' });
    });

    it('should handle values with colons', () => {
      const result = parseQuery('?time=12%3A30');
      expect(result).toEqual({ time: '12:30' });
    });

    it('should handle values with semicolons', () => {
      const result = parseQuery('?separator=a%3Bb');
      expect(result).toEqual({ separator: 'a;b' });
    });

    it('should handle values with percent signs', () => {
      const result = parseQuery('?discount=50%25');
      expect(result).toEqual({ discount: '50%' });
    });

    it('should handle empty values', () => {
      const result = parseQuery('?name=');
      expect(result).toEqual({ name: '' });
    });

    it('should handle keys without values', () => {
      const result = parseQuery('?flag');
      expect(result).toEqual({ flag: '' });
    });

    it('should handle multiple keys without values', () => {
      const result = parseQuery('?flag1&flag2&flag3');
      expect(result).toEqual({ flag1: '', flag2: '', flag3: '' });
    });

    it('should handle mix of keys with and without values', () => {
      const result = parseQuery('?name=John&flag&age=30');
      expect(result).toEqual({ name: 'John', flag: '', age: '30' });
    });

    it('should handle numeric values as strings', () => {
      const result = parseQuery('?count=42&price=19.99');
      expect(result).toEqual({ count: '42', price: '19.99' });
    });

    it('should handle boolean-like values as strings', () => {
      const result = parseQuery('?active=true&deleted=false');
      expect(result).toEqual({ active: 'true', deleted: 'false' });
    });

    it('should handle null-like values as strings', () => {
      const result = parseQuery('?value=null');
      expect(result).toEqual({ value: 'null' });
    });

    it('should handle JSON-like values as strings', () => {
      const result = parseQuery('?data=%7B%22key%22%3A%22value%22%7D');
      expect(result).toEqual({ data: '{"key":"value"}' });
    });

    it('should handle array-like values as strings', () => {
      const result = parseQuery('?items=%5B1%2C2%2C3%5D');
      expect(result).toEqual({ items: '[1,2,3]' });
    });

    it('should handle URL-encoded keys', () => {
      const result = parseQuery('?user%20name=John');
      expect(result).toEqual({ 'user name': 'John' });
    });

    it('should handle keys with special characters', () => {
      const result = parseQuery('?user%40name=John');
      expect(result).toEqual({ 'user@name': 'John' });
    });

    it('should handle keys with dots', () => {
      const result = parseQuery('?user.name=John');
      expect(result).toEqual({ 'user.name': 'John' });
    });

    it('should handle keys with brackets', () => {
      const result = parseQuery('?user%5Bname%5D=John');
      expect(result).toEqual({ 'user[name]': 'John' });
    });

    it('should handle keys with underscores', () => {
      const result = parseQuery('?user_name=John');
      expect(result).toEqual({ user_name: 'John' });
    });

    it('should handle keys with hyphens', () => {
      const result = parseQuery('?user-name=John');
      expect(result).toEqual({ 'user-name': 'John' });
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(1000);
      const result = parseQuery(`?data=${longValue}`);
      expect(result).toEqual({ data: longValue });
    });

    it('should handle many key-value pairs', () => {
      const params = Array.from({ length: 100 }, (_, i) => `key${i}=value${i}`).join('&');
      const result = parseQuery(`?${params}`);

      for (let i = 0; i < 100; i++) {
        expect(result[`key${i}`]).toBe(`value${i}`);
      }
    });

    it('should handle Unicode characters', () => {
      const result = parseQuery('?name=%E5%BC%A0%E4%B8%89');
      expect(result).toEqual({ name: '张三' });
    });

    it('should handle emoji characters', () => {
      const result = parseQuery('?emoji=%F0%9F%98%80');
      expect(result).toEqual({ emoji: '😀' });
    });

    it('should handle mixed Unicode and ASCII', () => {
      const result = parseQuery('?name=John%20%E5%BC%A0%E4%B8%89');
      expect(result).toEqual({ name: 'John 张三' });
    });

    it('should preserve order of parameters', () => {
      const result = parseQuery('?c=3&a=1&b=2');
      const keys = Object.keys(result);
      expect(keys).toEqual(['c', 'a', 'b']);
    });

    it('should handle query string without leading question mark', () => {
      const result = parseQuery('name=John&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle query string with multiple question marks', () => {
      const result = parseQuery('?name=John?&age=30');
      expect(result).toEqual({ name: 'John?', age: '30' });
    });

    it('should handle query string with multiple ampersands', () => {
      const result = parseQuery('?name=John&&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle query string with trailing ampersand', () => {
      const result = parseQuery('?name=John&age=30&');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle query string with leading ampersand', () => {
      const result = parseQuery('?&name=John&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle query string with only ampersands', () => {
      const result = parseQuery('?&&&');
      expect(result).toEqual({});
    });

    it('should handle duplicate keys with different values', () => {
      const result = parseQuery('?id=1&id=2&id=3');
      expect(result).toEqual({ id: ['1', '2', '3'] });
    });

    it('should handle duplicate keys with empty values', () => {
      const result = parseQuery('?id=&id=&id=');
      expect(result).toEqual({ id: ['', '', ''] });
    });

    it('should handle duplicate keys with mixed values', () => {
      const result = parseQuery('?id=1&id=&id=3');
      expect(result).toEqual({ id: ['1', '', '3'] });
    });

    it('should handle case-sensitive keys', () => {
      const result = parseQuery('?Name=John&name=Jane');
      expect(result).toEqual({ Name: 'John', name: 'Jane' });
    });

    it('should handle case-sensitive values', () => {
      const result = parseQuery('?name=JOHN');
      expect(result).toEqual({ name: 'JOHN' });
    });

    it('should handle whitespace in values', () => {
      const result = parseQuery('?name=%20John%20');
      expect(result).toEqual({ name: ' John ' });
    });

    it('should handle tabs in values', () => {
      const result = parseQuery('?name=John%09Doe');
      expect(result).toEqual({ name: 'John\tDoe' });
    });

    it('should handle newlines in values', () => {
      const result = parseQuery('?text=Line1%0ALine2');
      expect(result).toEqual({ text: 'Line1\nLine2' });
    });

    it('should handle carriage returns in values', () => {
      const result = parseQuery('?text=Line1%0DLine2');
      expect(result).toEqual({ text: 'Line1\rLine2' });
    });

    it('should handle CRLF in values', () => {
      const result = parseQuery('?text=Line1%0D%0ALine2');
      expect(result).toEqual({ text: 'Line1\r\nLine2' });
    });

    it('should handle complex real-world query string', () => {
      const result = parseQuery(
        '?q=typescript&sort=stars&order=desc&per_page=10&page=1&language=typescript&stars=>=1000'
      );
      expect(result).toEqual({
        q: 'typescript',
        sort: 'stars',
        order: 'desc',
        per_page: '10',
        page: '1',
        language: 'typescript',
        stars: '>=1000',
      });
    });

    it('should handle e-commerce query string', () => {
      const result = parseQuery('?category=electronics&brand=apple&price_min=100&price_max=1000&rating=4');
      expect(result).toEqual({
        category: 'electronics',
        brand: 'apple',
        price_min: '100',
        price_max: '1000',
        rating: '4',
      });
    });

    it('should handle search query string', () => {
      const result = parseQuery('?search=router&filters=type%3Astatic&filters=type%3Adynamic&sort=relevance');
      expect(result).toEqual({
        search: 'router',
        filters: ['type:static', 'type:dynamic'],
        sort: 'relevance',
      });
    });

    it('should handle API query string', () => {
      const result = parseQuery('?api_key=abc123&format=json&v=2&callback=handleResponse');
      expect(result).toEqual({
        api_key: 'abc123',
        format: 'json',
        v: '2',
        callback: 'handleResponse',
      });
    });

    it('should handle pagination query string', () => {
      const result = parseQuery('?offset=20&limit=10&total=100');
      expect(result).toEqual({
        offset: '20',
        limit: '10',
        total: '100',
      });
    });

    it('should handle date query string', () => {
      const result = parseQuery('?start_date=2024-01-01&end_date=2024-12-31');
      expect(result).toEqual({
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      });
    });

    it('should handle time query string', () => {
      const result = parseQuery('?start_time=09%3A00&end_time=17%3A00');
      expect(result).toEqual({
        start_time: '09:00',
        end_time: '17:00',
      });
    });

    it('should handle coordinates query string', () => {
      const result = parseQuery('?lat=40.7128&lng=-74.0060');
      expect(result).toEqual({
        lat: '40.7128',
        lng: '-74.0060',
      });
    });

    it('should handle color query string', () => {
      const result = parseQuery('?color=%23ff0000&bg=%23000000');
      expect(result).toEqual({
        color: '#ff0000',
        bg: '#000000',
      });
    });

    it('should handle email query string', () => {
      const result = parseQuery('?email=user%40example.com&cc=admin%40example.com');
      expect(result).toEqual({
        email: 'user@example.com',
        cc: 'admin@example.com',
      });
    });

    it('should handle phone query string', () => {
      const result = parseQuery('?phone=%2B1-555-123-4567');
      expect(result).toEqual({
        phone: '+1-555-123-4567',
      });
    });

    it('should handle currency query string', () => {
      const result = parseQuery('?price=%2419.99&currency=USD');
      expect(result).toEqual({
        price: '$19.99',
        currency: 'USD',
      });
    });

    it('should handle percentage query string', () => {
      const result = parseQuery('?discount=25%25&tax=8.5%25');
      expect(result).toEqual({
        discount: '25%',
        tax: '8.5%',
      });
    });

    it('should handle file path query string', () => {
      const result = parseQuery('?path=%2Fhome%2Fuser%2Fdocuments%2Ffile.txt');
      expect(result).toEqual({
        path: '/home/user/documents/file.txt',
      });
    });

    it('should handle URL query string', () => {
      const result = parseQuery('?url=https%3A%2F%2Fexample.com%2Fpath%3Fparam%3Dvalue');
      expect(result).toEqual({
        url: 'https://example.com/path?param=value',
      });
    });

    it('should handle base64 query string', () => {
      const result = parseQuery('?data=SGVsbG8gV29ybGQ%3D');
      expect(result).toEqual({
        data: 'SGVsbG8gV29ybGQ=',
      });
    });

    it('should handle hash query string', () => {
      const result = parseQuery('?hash=a1b2c3d4e5f6');
      expect(result).toEqual({
        hash: 'a1b2c3d4e5f6',
      });
    });

    it('should handle UUID query string', () => {
      const result = parseQuery('?id=550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should handle version query string', () => {
      const result = parseQuery('?version=1.2.3-beta.1');
      expect(result).toEqual({
        version: '1.2.3-beta.1',
      });
    });

    it('should handle semver query string', () => {
      const result = parseQuery('?range=%5E1.0.0&exact=1.2.3');
      expect(result).toEqual({
        range: '^1.0.0',
        exact: '1.2.3',
      });
    });

    it('should handle boolean flags', () => {
      const result = parseQuery('?debug&verbose&silent');
      expect(result).toEqual({
        debug: '',
        verbose: '',
        silent: '',
      });
    });

    it('should handle mixed flags and values', () => {
      const result = parseQuery('?debug&level=info&verbose&format=json');
      expect(result).toEqual({
        debug: '',
        level: 'info',
        verbose: '',
        format: 'json',
      });
    });

    it('should handle nested-like query string', () => {
      const result = parseQuery('?user%5Bname%5D=John&user%5Bage%5D=30');
      expect(result).toEqual({
        'user[name]': 'John',
        'user[age]': '30',
      });
    });

    it('should handle array-like query string', () => {
      const result = parseQuery('?items%5B%5D=1&items%5B%5D=2&items%5B%5D=3');
      expect(result).toEqual({
        'items[]': ['1', '2', '3'],
      });
    });

    it('should handle complex nested query string', () => {
      const result = parseQuery(
        '?filter%5Bcategory%5D=electronics&filter%5Bprice%5D%5Bmin%5D=100&filter%5Bprice%5D%5Bmax%5D=1000'
      );
      expect(result).toEqual({
        'filter[category]': 'electronics',
        'filter[price][min]': '100',
        'filter[price][max]': '1000',
      });
    });
  });
});
