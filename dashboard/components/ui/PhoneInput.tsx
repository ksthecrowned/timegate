'use client'

import ReactPhoneInput from 'react-phone-number-input'
import type { CountryCode } from 'libphonenumber-js'
import { isValidPhoneNumber } from 'libphonenumber-js'

const FALLBACK_COUNTRY: CountryCode = 'CG'

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
  countryIsoCode?: string | null
  organizationCountryIsoCode?: string | null
  fallbackCountryIsoCode?: CountryCode
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
  const phoneValue = value.trim() || undefined

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
