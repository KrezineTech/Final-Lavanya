"use client"

import Image, { type ImageProps } from 'next/image'
import React from 'react'

export default function SafeImage(props: ImageProps) {
  const srcAny = (props.src as any) ?? null
  // Only support string src values; defensively return null for empty strings or non-strings
  if (!srcAny || typeof srcAny !== 'string') return null
  const src = srcAny.trim()
  if (src.length === 0) return null
  // Forward props to Next Image when src is valid
  return <Image {...props} />
}
