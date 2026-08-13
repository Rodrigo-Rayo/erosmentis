import sharp from 'sharp'

// Rose -> lavender diagonal gradient, boosted from the app's --color-accent / --color-couple-b
// tokens for enough contrast on a phone home screen (the pale near-white background this
// replaced made the icon nearly invisible next to other apps).
const GRADIENT_FROM = '#b34862'
const GRADIENT_TO = '#9076be'
const SOURCE = 'public/icons/logo-source.png'

function gradientSvg(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${GRADIENT_FROM}" />
          <stop offset="100%" stop-color="${GRADIENT_TO}" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)" />
    </svg>
  `)
}

/** White silhouette of the source mark — keeps its alpha shape but flattens RGB to solid
 * white, so it reads clearly against the colored gradient instead of blending into it. */
async function whiteLogo(size) {
  const resized = await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { data, info } = resized
  for (let i = 0; i < data.length; i += info.channels) {
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
  }

  return sharp(data, { raw: info }).png().toBuffer()
}

async function makeIcon(size, outPath, logoScale) {
  const logoSize = Math.round(size * logoScale)
  const logo = await whiteLogo(logoSize)
  await sharp(gradientSvg(size))
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath)
}

async function main() {
  await makeIcon(192, 'public/icons/icon-192.png', 0.66)
  await makeIcon(512, 'public/icons/icon-512.png', 0.66)
  await makeIcon(512, 'public/icons/icon-maskable-512.png', 0.5)
  await makeIcon(180, 'public/apple-touch-icon.png', 0.66)
  await makeIcon(48, 'public/favicon.png', 0.7)
  console.log('Icons generated: gradient background, white mark, larger scale.')
}

main()
