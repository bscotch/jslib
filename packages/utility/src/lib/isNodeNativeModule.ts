/**
 * Node module names cache, since it looks like retrieving
 * it returns a fresh copy every time.
 *
 * (Note that `process.binding` is undocumented!)
 */
let nativeNodeModuleNames: Set<string>;
/**
 * Check if a string matches a native (built-in) node module name.
 */
export function isNodeNativeModule(path: string): boolean {
  const [, protocol, name] = path.match(/^([^:]+:)?(.+)$/) as string[];
  if (protocol && protocol != 'declaration') {
    return false;
  }
  // @ts-expect-error Property 'binding' does not exist on type 'Process'.
  nativeNodeModuleNames ||= new Set(Object.keys(process.binding('natives')));
  return nativeNodeModuleNames.has(name);
}
