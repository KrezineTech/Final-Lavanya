"use client"

import React from 'react'

type Props = {
  id: string
  name?: string
  placeholder?: string
  required?: boolean
  className?: string
}

export default function PasswordInput({ id, name, placeholder, required, className }: Props) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name={name || id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        required={required}
        className={className}
      />

      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-600"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
