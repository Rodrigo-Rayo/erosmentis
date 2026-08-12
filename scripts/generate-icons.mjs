import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const iconSvg = readFileSync('public/icons/source-icon.svg')
const maskableSvg = readFileSync('public/icons/source-icon-maskable.svg')

async function main() {
  await sharp(iconSvg).resize(192, 192).png().toFile('public/icons/icon-192.png')
  await sharp(iconSvg).resize(512, 512).png().toFile('public/icons/icon-512.png')
  await sharp(maskableSvg).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png')
  await sharp(iconSvg).resize(180, 180).png().toFile('public/apple-touch-icon.png')
  console.log('Icons generated.')
}

main()
