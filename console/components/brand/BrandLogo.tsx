import Image from 'next/image'

export type BrandLogoVariant = 'full' | 'icon'
export type BrandLogoTone = 'on-dark' | 'on-light'

/** PNG transparents — priorité sur les anciens JPEG avec fond. */
const LOGO_PATHS: Record<BrandLogoTone, Record<BrandLogoVariant, string>> = {
  'on-dark': {
    full: '/images/logos/timegate-logo-full-white.png',
    icon: '/images/logos/timegate-icon-white.png',
  },
  'on-light': {
    full: '/images/logos/timegate-logo-full-color.png',
    icon: '/images/logos/timegate-icon-color.png',
  },
}

type BrandLogoProps = {
  variant?: BrandLogoVariant
  tone?: BrandLogoTone
  className?: string
  priority?: boolean
}

export default function BrandLogo({
  variant = 'full',
  tone = 'on-dark',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const src = LOGO_PATHS[tone][variant]
  const width = variant === 'full' ? 240 : 56
  const height = variant === 'full' ? 80 : 56

  return (
    <Image
      src={src}
      alt="TimeGate"
      width={width}
      height={height}
      priority={priority}
      className={`h-auto w-auto object-contain ${className}`}
    />
  )
}
