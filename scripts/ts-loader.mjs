export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
        try {
          return await defaultResolve(specifier + ext, context);
        } catch {
          // continue checking next extension
        }
      }
    }
    throw err;
  }
}
