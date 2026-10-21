export function assertCloudinary(url) {
  let host = '';
  try { host = new URL(url).hostname; } catch { /* URL inválida */ }
  if (host !== 'res.cloudinary.com') throw new Error('Para generar la curva, la referencia debe estar en Cloudinary (res.cloudinary.com).');
}
