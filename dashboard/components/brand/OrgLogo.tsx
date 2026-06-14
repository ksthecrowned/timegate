'use client'

import Image from 'next/image'
import BrandLogo, { type BrandLogoTone, type BrandLogoVariant } from '@/components/brand/BrandLogo'
import { useOrganization } from '@/components/providers/OrganizationProvider'

type OrgLogoProps = {
  variant?: BrandLogoVariant
  tone?: BrandLogoTone
  className?: string
  priority?: boolean
}

export default function OrgLogo({
  variant = 'full',
  tone = 'on-dark',
  className = '',
  priority = false,
}: OrgLogoProps) {
  const { company } = useOrganization()

  if (company?.logoUrl) {
    const width = variant === 'full' ? 220 : 56
    const height = variant === 'full' ? 72 : 56

    return (
      <Image
        src={company.logoUrl}
        alt={company.name ?? 'Organisation'}
        width={width}
        height={height}
        priority={priority}
        unoptimized={company.logoUrl.startsWith('http')}
        className={`h-auto w-auto max-h-16 object-contain ${className}`}
      />
    )
  }

  return <BrandLogo variant={variant} tone={tone} className={className} priority={priority} />
}
