import sharp from 'sharp'

const BG = '#fdfbf9'
const SOURCE = 'public/icons/logo-source.png'

async function makeIcon(size, outPath, logoScale) {
  const logoSize = Math.round(size * logoScale)
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath)
}

async function main() {
  await makeIcon(192, 'public/icons/icon-192.png', 0.74)
  await makeIcon(512, 'public/icons/icon-512.png', 0.74)
  await makeIcon(512, 'public/icons/icon-maskable-512.png', 0.56)
  await makeIcon(180, 'public/apple-touch-icon.png', 0.74)
  await makeIcon(48, 'public/favicon.png', 0.78)
  console.log('Icons generated from the real logo.')
}

main()
