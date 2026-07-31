'use client'

import type { CountryCode } from 'libphonenumber-js'
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'
import { useMemo } from 'react'
import ReactPhoneInput from 'react-phone-number-input'

const FALLBACK_COUNTRY: CountryCode = 'CG'

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
  countryIsoCode?: string | null
  organizationCountryIsoCode?: string | null
  fallbackCountryIsoCode?: CountryCode
}

/** Normalise vers E.164 (`+242061234567`) — requis par react-phone-number-input. */
function toE164(value: string, defaultCountry: CountryCode): string | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  const parsed =
    parsePhoneNumberFromString(raw, defaultCountry) ??
    parsePhoneNumberFromString(raw.replace(/[\s().-]/g, ''), defaultCountry)
  return parsed?.number
}

export default function PhoneInput({
  value,
  onChange,
  countryIsoCode,
  organizationCountryIsoCode,
  fallbackCountryIsoCode = FALLBACK_COUNTRY,
  placeholder,
  className = '',
  disabled,
  required,
  name,
  id,
  ...props
}: PhoneInputProps) {
  const normalizedCountry = (
    countryIsoCode ||
    organizationCountryIsoCode ||
    fallbackCountryIsoCode
  ).toUpperCase()
  const resolvedCountry =
    normalizedCountry.length === 2 ? (normalizedCountry as CountryCode) : fallbackCountryIsoCode
  const resolvedPlaceholder = placeholder ?? '+242 06 123 45 67'

  const phoneValue = useMemo(
    () => toE164(value, resolvedCountry),
    [value, resolvedCountry],
  )

  return (
    <div className="space-y-1">
      <ReactPhoneInput
        {...props}
        className={`tg-phone-input ${className}`.trim()}
        defaultCountry={resolvedCountry}
        international={false}
        countryCallingCodeEditable={false}
        value={phoneValue}
        onChange={(next) => onChange(next ?? '')}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        inputComponent="input"
        smartCaret={false}
        numberInputProps={{
          id,
          name,
          required,
          disabled,
          autoComplete: 'tel',
        }}
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {phoneValue && !isValidPhoneNumber(phoneValue)
          ? 'Numéro invalide (format international requis).'
          : `Pays par défaut: ${resolvedCountry}`}
      </p>
    </div>
  )
}
