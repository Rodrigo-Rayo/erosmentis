import sharp from 'sharp'

// Same soft radial wash as the app's own background (src/styles/global.css), rendered at
// app-icon scale: pale rose top-left, pale sage top-right, near-white paper underneath.
const ROSE = '#ffe8eb'
const SAGE = '#e0f0e3'
const PAPER = '#fdfcf9'
const SOURCE = 'public/icons/logo-source.png'

// Thickens the source mark's thin linework by morphological dilation on its alpha channel —
// each pass grows the shape by ~1px (at MASTER_SIZE resolution) and copies RGB from the most
// opaque neighbor, so the mark's own pink-to-lavender gradient carries into the new pixels
// instead of leaving flat color at the grown edges.
const MASTER_SIZE = 900
const DILATE_PASSES = 10

async function buildThickenedMaster() {
  const { data, info } = await sharp(SOURCE)
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  let current = data

  for (let pass = 0; pass < DILATE_PASSES; pass++) {
    const next = Buffer.from(current)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels
        let bestAlpha = current[idx + 3]
        let bestR = current[idx]
        let bestG = current[idx + 1]
        let bestB = current[idx + 2]
        const neighbors = [
          [-1, 0], [1, 0], [0, -1], [0, 1],
          [-1, -1], [1, -1], [-1, 1], [1, 1],
        ]
        for (const [dx, dy] of neighbors) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nidx = (ny * width + nx) * channels
          if (current[nidx + 3] > bestAlpha) {
            bestAlpha = current[nidx + 3]
            bestR = current[nidx]
            bestG = current[nidx + 1]
            bestB = current[nidx + 2]
          }
        }
        next[idx] = bestR
        next[idx + 1] = bestG
        next[idx + 2] = bestB
        next[idx + 3] = bestAlpha
      }
    }
    current = next
  }

  return sharp(current, { raw: info }).png().toBuffer()
}

function backgroundSvg(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rose" cx="10%" cy="0%" r="75%">
          <stop offset="0%" stop-color="${ROSE}" />
          <stop offset="60%" stop-color="${ROSE}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="sage" cx="100%" cy="15%" r="70%">
          <stop offset="0%" stop-color="${SAGE}" />
          <stop offset="55%" stop-color="${SAGE}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="${PAPER}" />
      <rect width="${size}" height="${size}" fill="url(#sage)" />
      <rect width="${size}" height="${size}" fill="url(#rose)" />
    </svg>
  `)
}

async function makeIcon(masterLogo, size, outPath, logoScale) {
  const logoSize = Math.round(size * logoScale)
  const logo = await sharp(masterLogo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp(backgroundSvg(size))
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath)
}

async function main() {
  const masterLogo = await buildThickenedMaster()
  await makeIcon(masterLogo, 192, 'public/icons/icon-192.png', 0.84)
  await makeIcon(masterLogo, 512, 'public/icons/icon-512.png', 0.84)
  await makeIcon(masterLogo, 512, 'public/icons/icon-maskable-512.png', 0.62)
  await makeIcon(masterLogo, 180, 'public/apple-touch-icon.png', 0.84)
  await makeIcon(masterLogo, 48, 'public/favicon.png', 0.88)
  console.log('Icons generated: app-matching soft gradient background, thicker original-color mark.')
}

main()
